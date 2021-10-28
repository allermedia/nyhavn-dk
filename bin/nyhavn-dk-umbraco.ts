#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { NyhavnDkUmbracoStack } from '../lib/nyhavn-dk-umbraco-stack';

const app = new cdk.App();
new NyhavnDkUmbracoStack(app, 'NyhavnDkUmbracoStack', {
    env: { account: '778431939928', region: 'eu-west-1' },
});
