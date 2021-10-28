import * as cdk from '@aws-cdk/core';
import { Construct, Stage, StageProps, Stack, StackProps } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';

import {  Vpc, InstanceClass, InstanceSize, SubnetType } from '@aws-cdk/aws-ec2';

import { CertificateStack, CertificateStackProbs } from './certificate-stack'
import { NetworkStack, NetworkStackProbs } from './network-stack'
import { HostingStack, HostingStackProbs } from './hosting-stack'


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
    cdkPipeline.addStage(new HostingStageStaging(this,'Hosting-Stage', {}))
  }
}


export class HostingStageStaging extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const networkStack = new NetworkStack(this, 'Network', {
      cidr: "10.26.0.0/16",
      environment: "staging",
      projectName: "stage.nyhavn.dk server"
    });

    const certNyhavnDKStaging = new CertificateStack(this, 'Certificate-stageNyhavnDk', {
      domainName: "stage.nyhavn.dk",
      alternateNames: ['www.stage.nyhavn.dk'],
      projectName: "stage.nyhavn.dk"
    });
    certNyhavnDKStaging.addDependency(networkStack);

    const nyhavnHostingStaging = new HostingStack(this, 'nyhavnHostingStaging', {
      projectDescription: "stage-nyhavn-dk",
      apexDomain: "stage.nyhavn.dk",
      certificateArn: certNyhavnDKStaging.certificateArn,
      environment: "staging",
      vpc: networkStack.myVpc,
      backup: "Week",
      instanceClass: InstanceClass.T4G,
      instanceSize: InstanceSize.LARGE,
      instanceName: "tst-nyhavnstage01a",
      instanceRootSize: 100,
      instanceDatadiskSize: 350,
      internetfacingLoadbalancer: false,
      protectServer: false,
      rdsIdentifier: "nyhavn-stage",
      rdsAllocatedStorage: 30,
      rdsMaxAllocatedStorage: 100,
      rdsClass: InstanceClass.T4G,
      rdsSize: InstanceSize.LARGE,
      serverAmiString: "ami-082c0b4f77d193eba",
      serverRole: "Webserver"
    })
    nyhavnHostingStaging.addDependency(certNyhavnDKStaging);
  }
}