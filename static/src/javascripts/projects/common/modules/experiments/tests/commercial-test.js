// @flow strict

export const testTest: ABTest = {
    id: 'CommercialTest',
    start: '2020-04-29',
    expiry: '2020-05-12',
    author: 'Ricardo Costa',
    description: 'This is to test AB testing',
    audience: 1,
    audienceOffset: 0.0,
    successMeasure:
        "Users aren't removed from test whe viewing sensitive articles",
    audienceCriteria: 'n/a',
    dataLinkNames: 'n/a',
    idealOutcome: "Users aren't removed from tests",
    canRun: () => true,
    variants: [
        {
            id: 'control',
            test: (): void => {},
        },
        {
            id: 'variant',
            test: (): void => {},
        },
    ],
};
