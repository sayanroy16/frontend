// @flow

import { getBodyEnd } from '@guardian/automat-client';
import { getSync as geolocationGetSync } from 'lib/geolocation';
import {
    setupOnView2,
    emitBeginEvent,
    setupClickHandling2,
    emitInsertEvent2,
} from 'common/modules/commercial/contributions-utilities';
import reportError from 'lib/report-error';
import fastdom from 'lib/fastdom-promise';
import config from 'lib/config';
import { getMvtValue } from 'common/modules/analytics/mvt-cookie';
import { submitClickEvent } from 'common/modules/commercial/acquisitions-ophan';

import {
    getLastOneOffContributionDate,
    isRecurringContributor,
    shouldNotBeShownSupportMessaging,
} from 'common/modules/commercial/user-features';

declare type Meta = {
    abTestName: string,
    abTestVariant: string,
    campaignCode: string,
    campaignId: string,
}

const buildKeywordTags = page => {
    const keywordIds = page.keywordIds.split(',');
    const keywords = page.keywords.split(',');
    return keywordIds.map((id, idx) => ({
        id,
        type: 'Keyword',
        title: keywords[idx],
    }));
};

const renderEpic = (html: string, css: string): Promise<[HTMLElement, ?ShadowRoot]> => {
    const content = `<style>${css}</style>${html}`;

    return fastdom.write(() => {
        const target = document.querySelector(
            '.submeta'
        );

        if (!target) {
            reportError(
                new Error(
                    'Could not find target element for Epic'
                ),
                {},
                false
            );
            return;
        }

        const parent = target.parentNode;

        if (!parent) {
            return;
        }

        const container = document.createElement('div');
        parent.insertBefore(container, target);

        // use Shadow Dom if found
        let shadowRoot;
        if (container.attachShadow) {
            shadowRoot = container.attachShadow({
                mode: 'open',
            });
            shadowRoot.innerHTML = content;
        } else {
            container.innerHTML = content;
        }

        return shadowRoot || container;
    });
};

interface InitAutomatJsConfig {
    epicRoot: HTMLElement | ShadowRoot;
    onReminderOpen?: Function;
}

interface AutomatJsCallback {
    buttonCopyAsString: string;
}

// If the Epic has custom JS code, we need to eval it and call the function
// it defines. NOTE: this is a temporary solution to solve a particular
// requirement. The Automat team plans to replace/remove this very soon.
const executeJS = (container: HTMLElement | ShadowRoot, js: string) => {
    if (!js) {
        return;
    }

    try {
        // eslint-disable-next-line no-eval
        window.eval(js);
        if (
            typeof window.initAutomatJs ===
            'function'
        ) {
            const initAutomatJsConfig: InitAutomatJsConfig = {
                epicRoot: container,
                onReminderOpen: (callbackParams: AutomatJsCallback) => {
                    const { buttonCopyAsString } = callbackParams;
                    // Send two separate Ophan events when the Reminder
                    // button is clicked
                    submitClickEvent({
                        component: {
                            componentType: 'ACQUISITIONS_OTHER',
                            id: 'precontribution-reminder-prompt-clicked',
                        },
                    });
                    submitClickEvent({
                        component: {
                            componentType: 'ACQUISITIONS_OTHER',
                            id: `precontribution-reminder-prompt-copy-${buttonCopyAsString}`,
                        },
                    });
                },
            };
            window.initAutomatJs(initAutomatJsConfig);
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        reportError(error, {}, false);
    }
};

const buildPayload = () => {
    const ophan = config.get('ophan');
    const page = config.get('page');

    // note, there is a race condition so we want to fetch this as late as possible to give a change for the geo local storage value to be set
    const countryCode = geolocationGetSync();

    const tracking = {
        ophanPageId: ophan.pageViewId,
        ophanComponentId: 'ACQUISITIONS_EPIC',
        platformId: 'GUARDIAN_WEB',
        clientName: 'frontend',
        referrerUrl:
            window.location.origin + window.location.pathname,
    };

    const targeting = {
        contentType: page.contentType,
        sectionName: page.section,
        shouldHideReaderRevenue: page.shouldHideReaderRevenue,
        isMinuteArticle: config.hasTone('Minute'),
        isPaidContent: page.isPaidContent,
        isSensitive: page.isSensitive,
        tags: buildKeywordTags(page),
        // This test is already subjected to the 3 checks below, but
        // we're passing these properties to the Contributions
        // service for consistency with DCR.
        showSupportMessaging: !shouldNotBeShownSupportMessaging(),
        isRecurringContributor: isRecurringContributor(),
        lastOneOffContributionDate:
            getLastOneOffContributionDate() || undefined,
        mvtId: getMvtValue(),
        countryCode,
    };

    return {
        tracking,
        targeting,
    };
};

const checkResponseOk = response => {
    if (response.ok) {
        return response;
    }

    throw new Error(
        `Contributions fetch failed with response code: ${response.status}`
    );
};

// Fetch and set epic (if epic match found)
export const setEpic = () => {
    const payload = buildPayload();
    const products = ['CONTRIBUTION', 'MEMBERSHIP_SUPPORTER'];
    const componentType = 'ACQUISITIONS_EPIC';

    getBodyEnd(payload)
        .then(checkResponseOk)
        .then(response => {
            const json = response.json();

            if (json && json.data) {
                const { html, css, js, meta } = json.data;
                const trackingCampaignId = `epic_${meta.campaignId}`;

                emitBeginEvent(trackingCampaignId);
                setupClickHandling2(meta.abTestName, meta.abTestVariant, componentType, meta.campaignCode, products);

                renderEpic(html, css)
                    .then(([el, shadowRoot]) => {
                        executeJS(shadowRoot || el, js);
                        emitInsertEvent2('insert-event', componentType, products, meta.campaignCode)
                        setupOnView2(
                            el,
                            'view-event',
                            meta.testId,
                            componentType,
                            meta.campaignCode,
                            trackingCampaignId,
                            products
                        )})
            }
        })
};
