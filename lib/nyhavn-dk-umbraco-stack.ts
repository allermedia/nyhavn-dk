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
    cdkPipeline.addStage(new HostingStageTest(this,'HostingTest', {}))
    cdkPipeline.addStage(new HostingStageProd(this,'HostingProd', {}))
  }
}

export class HostingStageTest extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);


// Test
    const networkStackTest = new NetworkStack(this, 'NetworkTest', {
      cidr: "10.26.0.0/16",
      environment: "Test",
      projectName: "tst.nyhavn.dk server"
    });

    const certNyhavnDKTest = new CertificateStack(this, 'Certificate-testNyhavnDk', {
      domainName: "test.nyhavn.dk",
      alternateNames: ['www.test.nyhavn.dk'],
      projectName: "test.nyhavn.dk"
    });
    certNyhavnDKTest.addDependency(networkStackTest);

    const nyhavnHostingTest = new HostingStack(this, 'nyhavnHostingTest', {
      projectDescription: "test-nyhavn-dk",
      apexDomain: "test.nyhavn.dk",
      certificateArn: certNyhavnDKTest.certificateArn,
      environment: "Test",
      vpc: networkStackTest.myVpc,
      backup: "Week",
      instanceClass: InstanceClass.T3,
      instanceSize: InstanceSize.LARGE,
      instanceName: "tst-nyhavn01a",
      instanceRootSize: 100,
      instanceDatadiskSize: 350,
      internetfacingLoadbalancer: false,
      protectServer: false,
      rdsIdentifier: "nyhavn",
      rdsAllocatedStorage: 30,
      rdsMaxAllocatedStorage: 100,
      rdsClass: InstanceClass.T3,
      rdsSize: InstanceSize.LARGE,
      serverAmiString: "ami-082c0b4f77d193eba",
      serverRole: "Webserver"
    })
    nyhavnHostingTest.addDependency(certNyhavnDKTest);
  }
}


export class HostingStageProd extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

// Production

    const networkStackProd = new NetworkStack(this, 'NetworkProd', {
      cidr: "10.25.0.0/16",
      environment: "Prod",
      projectName: "prd.nyhavn.dk server"
    });

    const certNyhavnDKProd = new CertificateStack(this, 'Certificate-NyhavnDk', {
      domainName: "nyhavn.dk",
      alternateNames: ['www.nyhavn.dk'],
      projectName: "nyhavn.dk"
    });
    certNyhavnDKProd.addDependency(networkStackProd);


    const nyhavnHostingProd = new HostingStack(this, 'nyhavnHosting', {
      projectDescription: "nyhavn-dk",
      apexDomain: "nyhavn.dk",
      certificateArn: certNyhavnDKProd.certificateArn,
      environment: "Prod",
      vpc: networkStackProd.myVpc,
      backup: "Week",
      instanceClass: InstanceClass.T3,
      instanceSize: InstanceSize.LARGE,
      instanceName: "prd-nyhavn01a",
      instanceRootSize: 100,
      instanceDatadiskSize: 350,
      internetfacingLoadbalancer: false,
      protectServer: false,
      rdsIdentifier: "nyhavn",
      rdsAllocatedStorage: 30,
      rdsMaxAllocatedStorage: 100,
      rdsClass: InstanceClass.T3,
      rdsSize: InstanceSize.LARGE,
      serverAmiString: "ami-082c0b4f77d193eba",
      serverRole: "Webserver"
    })
    nyhavnHostingProd.addDependency(certNyhavnDKProd);

  }
}