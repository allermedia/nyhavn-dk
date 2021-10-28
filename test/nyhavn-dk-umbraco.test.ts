import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as NyhavnDkUmbraco from '../lib/nyhavn-dk-umbraco-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new NyhavnDkUmbraco.NyhavnDkUmbracoStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
