import * as cdk from '@aws-cdk/core';
import { Construct, Stage, StageProps, Stack, StackProps } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';

import {  Vpc, InstanceClass, InstanceSize, SubnetType } from '@aws-cdk/aws-ec2';

import { CertificateStack, CertificateStackProbs } from '../lib/certificate-stack'
import { NetworkStack, NetworkStackProbs } from '../lib/network-stack'


export class NyhavnDkUmbracoStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CDK Pipeline
    const cdkPipeline = new CodePipeline(this, 'Pipeline', {
      selfMutation: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('allermedia/nyhavn-dk', 'main', {
          connectionArn: 'arn:aws:codestar-connections:eu-west-1:778431939928:connection/fb59b553-e585-4348-ae17-186bddf1bbac',
        }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
    });

    cdkPipeline.addStage(new HostingStageProd(this,'Hosting-Prod', {}))

  }
}


export class HostingStageProd extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const networkStack = new NetworkStack(this, 'Network', {
      cidr: "10.25.0.0/16",
      environment: "prod",
      projectName: "nyhavn.dk prod server"
    });

    const certNyhavnDK = new CertificateStack(this, 'Certificate-NyhavnDk', {
      domainName: "*.nyhavn.dk",
      alternateNames: ['nyhavn.dk', 'www.nyhavn.dk'],
      projectName: "nyhavn.dk"
    });
    certNyhavnDK.addDependency(networkStack);
  }
}