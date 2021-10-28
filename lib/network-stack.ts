// VPC

import { Tags, Construct, Stack, StackProps, CfnOutput, Stage, StageProps } from '@aws-cdk/core';
import { Vpc, SubnetType } from '@aws-cdk/aws-ec2'

export interface NetworkStackProbs extends StackProps {
    projectName: string
    environment: string
    cidr: string
}
export class NetworkStack extends Stack {
    public readonly myVpc: Vpc;
    public readonly publicSubnetIds: string[]
    public readonly rdsSubnetIds: string[]

    constructor(scope: Construct, id: string, props: NetworkStackProbs) {
        super(scope, id, props);

        const vpc = new Vpc(this, 'VPC', {
            cidr: props.cidr,
            maxAzs: 2, // 2 Subnets needed for RDS
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'public',
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'isolated',
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
        Tags.of(vpc).add('Name', props.environment + 'VPC');
        Tags.of(vpc).add('Environment', props.environment);

        this.myVpc = vpc;
    }
}