// @flow

import { acquisitionsBannerControlTemplate } from 'common/modules/commercial/templates/acquisitions-banner-control';
import {
    getLocalCurrencySymbol,
    getSync as geolocationGetSync,
} from 'lib/geolocation';

const geolocation = geolocationGetSync();

const canRunBool = !['US', 'GB', 'AU'].includes(geolocation)
const controlMessageText = 'You are reading the CONTROL message text';
const variantMessageText = 'You are reading the VARIANT message text';
const ctaText = `<span class="engagement-banner__highlight"> Support The Guardian from as little as ${getLocalCurrencySymbol(
    geolocation
)}1</span>`;

export const testBanner: AcquisitionsABTest = {
    id: 'ContributionsBannerTestBanner',
    campaignId: 'contributions_banner_test_banner',
    start: '2020-05-14',
    expiry: '2020-10-30',
    author: 'Michael Jacobson & Thalia Silver',
    description: 'show number of articles viewed in contributions banner',
    audience: 1,
    audienceOffset: 0,
    successMeasure: 'AV per impression',
    audienceCriteria: 'All',
    idealOutcome: 'variant design performs at least as well as control',
    canRun: () => canRunBool,
    showForSensitive: true,
    componentType: 'ACQUISITIONS_ENGAGEMENT_BANNER',
    geolocation,
    variants: [
        {
            id: 'control',
            test: (): void => {},
            engagementBannerParams: {
                leadSentence: `Thalia and Michael made this :)`,
                messageText: controlMessageText,
                ctaText,
                template: acquisitionsBannerControlTemplate,
                userCohort: 'AllExistingSupporters',
            },
        },
        {
            id: 'variant',
            test: (): void => {},
            engagementBannerParams: {
                leadSentence: `Thalia and Michael made this :)`,
                messageText: variantMessageText,
                ctaText,
                template: acquisitionsBannerControlTemplate,
                userCohort: 'AllExistingSupporters',
            },
        },
    ],
};
