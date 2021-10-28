import { Tags, Construct, Stack, StackProps, CfnOutput, Stage, StageProps } from '@aws-cdk/core';
import { Certificate, CertificateValidation } from '@aws-cdk/aws-certificatemanager';

export interface CertificateStackProbs extends StackProps {
    projectName: string
    domainName: string
    alternateNames: string[]
}
export class CertificateStack extends Stack {
    public readonly certificate: Certificate;
    public readonly certificateArn: string;

    constructor(scope: Construct, id: string, props: CertificateStackProbs) {
        super(scope, id, props);

        Tags.of(this).add('Project', props.projectName, {
            priority: 300,
        });

        const certificate = new Certificate(this, 'Certificate', {
            domainName: props.domainName,
            subjectAlternativeNames: props.alternateNames,
            validation: CertificateValidation.fromDns(),
        });
        Tags.of(certificate).add('Name', props.domainName, {
            priority: 100,
        });

        this.certificateArn = certificate.certificateArn;

    }
}