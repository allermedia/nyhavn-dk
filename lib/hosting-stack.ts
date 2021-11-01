import { Tags, Construct, Stack, StackProps, CfnOutput, Stage, StageProps, Duration } from '@aws-cdk/core';
import { Vpc, SubnetType, Port, Peer, SecurityGroup, MachineImage, CfnEIP, Instance, InstanceType, InstanceClass, InstanceSize, BlockDeviceVolume, EbsDeviceVolumeType, UserData, CfnEIPAssociation} from '@aws-cdk/aws-ec2';
import { DatabaseInstance, DatabaseInstanceEngine, SqlServerEngineVersion, Credentials } from '@aws-cdk/aws-rds';
import { Role, ServicePrincipal, ManagedPolicy} from '@aws-cdk/aws-iam';
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, IpAddressType, ListenerAction, ListenerCondition, Protocol, SslPolicy, TargetType } from '@aws-cdk/aws-elasticloadbalancingv2';
import { InstanceTarget } from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import { Certificate } from '@aws-cdk/aws-certificatemanager';

export interface HostingStackProbs extends StackProps {
    projectDescription: string,
    environment: string,
    vpc: Vpc,
    instanceName: string,
    instanceClass: InstanceClass,
    instanceSize: InstanceSize,
    serverAmiString: string,
    protectServer: boolean,
    instanceRootSize: number,
    instanceDatadiskSize: number
    serverRole: string
    backup: string
    internetfacingLoadbalancer: boolean
    certificateArn: string
    apexDomain: string
    rdsIdentifier: string,
    rdsAllocatedStorage: number
    rdsMaxAllocatedStorage: number
    rdsClass: InstanceClass,
    rdsSize: InstanceSize,
}

export class HostingStack extends Stack {
    constructor(scope: Construct, id: string, props: HostingStackProbs) {
        super(scope, id, props);

// SecurityGroup
        const serverSecurityGroup = new SecurityGroup(this, 'ServerSecurityGroup-' + props.environment, {
            vpc: props.vpc,
            allowAllOutbound: true
        })

        Tags.of(serverSecurityGroup).add('Environment', props.environment);
        serverSecurityGroup.addIngressRule(serverSecurityGroup, Port.allTraffic(), "Allow securitygroup to talk to itself");

        //HTTP, HTTPs and RDS access rules from offices
        serverSecurityGroup.addIngressRule(Peer.ipv4('91.199.217.134/32'), Port.tcp(3389), 'Allow HTTP access from Aller office Havneholmen');
        serverSecurityGroup.addIngressRule(Peer.ipv4('91.199.217.134/32'), Port.tcp(80), 'Allow HTTP access from Aller office Havneholmen');
        serverSecurityGroup.addIngressRule(Peer.ipv4('91.199.217.134/32'), Port.tcp(443), 'Allow HTTPS access from Aller office Havneholmen');


        //HTTP, HTTPs and RDS access rules from Easyflow
        serverSecurityGroup.addIngressRule(Peer.ipv4('77.243.39.42/32'), Port.tcp(3389), 'Allow RDP access from Easyflow');
        serverSecurityGroup.addIngressRule(Peer.ipv4('77.243.39.42/32'), Port.tcp(80), 'Allow HTTP access from Easyflow');
        serverSecurityGroup.addIngressRule(Peer.ipv4('77.243.39.42/32'), Port.tcp(443), 'Allow HTTPS access from Easyflow');

        // DeployHQ Rules
        serverSecurityGroup.addIngressRule(Peer.ipv4('152.89.76.109/32'), Port.tcpRange(21, 22), 'Allow FTP access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('152.89.76.110/32'), Port.tcpRange(21, 22), 'Allow FTP access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('152.89.76.111/32'), Port.tcpRange(21, 22), 'Allow FTP access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.22.211.0/24'), Port.tcpRange(21, 22), 'Allow FTP access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.69.56.208/32'), Port.tcpRange(21, 22), 'Allow FTP access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.69.56.209/32'), Port.tcpRange(21, 22), 'Allow FTP access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.69.56.210/32'), Port.tcpRange(21, 22), 'Allow FTP access from DeployHQ');

        // Passive FTP
        serverSecurityGroup.addIngressRule(Peer.ipv4('152.89.76.109/32'), Port.tcpRange(49152, 65535), 'Allow FTP-PassiveMode access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('152.89.76.110/32'), Port.tcpRange(49152, 65535), 'Allow FTP-PassiveMode access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('152.89.76.111/32'), Port.tcpRange(49152, 65535), 'Allow FTP-PassiveMode access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.22.211.0/24'),  Port.tcpRange(49152, 65535), 'Allow FTP-PassiveMode access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.69.56.208/32'), Port.tcpRange(49152, 65535), 'Allow FTP-PassiveMode access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.69.56.209/32'), Port.tcpRange(49152, 65535), 'Allow FTP-PassiveMode access from DeployHQ');
        serverSecurityGroup.addIngressRule(Peer.ipv4('185.69.56.210/32'), Port.tcpRange(49152, 65535), 'Allow FTP-PassiveMode access from DeployHQ');


        const publicSecurityGroup = new SecurityGroup(this, 'PublicSecurityGroup-' + props.environment, {
            vpc: props.vpc
        })
        publicSecurityGroup.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(80), 'Allow HTTP access from Everywhere');
        publicSecurityGroup.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(443), 'Allow HTTPS access from Everywhere');
        publicSecurityGroup.addIngressRule(serverSecurityGroup, Port.allTraffic(), "Allow securitygroup to talk to server security Group");


        const privateSecurityGroup = new SecurityGroup(this, 'PrivateSecurityGroup-' + props.environment, {
            vpc: props.vpc
        })
        publicSecurityGroup.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(80), 'Allow HTTP access from Everywhere');
        publicSecurityGroup.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(443), 'Allow HTTPS access from Everywhere');
        publicSecurityGroup.addIngressRule(serverSecurityGroup, Port.allTraffic(), "Allow securitygroup to talk to server security Group");
        publicSecurityGroup.addIngressRule(Peer.ipv4('91.199.217.134/32'), Port.tcp(80), 'Allow HTTP access from Aller office Havneholmen');
        publicSecurityGroup.addIngressRule(Peer.ipv4('91.199.217.134/32'), Port.tcp(443), 'Allow HTTPS access from Aller office Havneholmen');
        publicSecurityGroup.addIngressRule(Peer.ipv4('77.243.39.42/32'), Port.tcp(80), 'Allow HTTP access from Easyflow');
        publicSecurityGroup.addIngressRule(Peer.ipv4('77.243.39.42/32'), Port.tcp(443), 'Allow HTTPS access from Easyflow');


// InstanceRole
        const instanceRole = new Role(this, 'serverInstanceRole-' + props.environment, {
            roleName: 'serverInstanceRole' + props.environment,
            assumedBy: new ServicePrincipal('ec2.amazonaws.com')
        });
        instanceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        instanceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        Tags.of(instanceRole).add('Environment', props.environment);

// Server

        // AMI
        const serverAmi = MachineImage.genericWindows({'eu-west-1': props.serverAmiString})

        // Elastic IP
        const serverEip = new CfnEIP(this, "serverIP-" + props.environment);
        Tags.of(serverEip).add('Environment', props.environment);


        // Userdata for
        const userData = UserData.forWindows();

        // Userdata to install IIS
        userData.addCommands("Install-WindowsFeature -name Web-Server -IncludeManagementTools");

        // Userdata to Install mssql studio
        userData.addCommands(
            "$InstallerSQL = $env:TEMP + '\' + 'SSMS-Setup-ENU.exe'",
            "Invoke-WebRequest 'https://aka.ms/ssmsfullsetup' -OutFile $InstallerSQL",
            "start $InstallerSQL /Quiet",
            "Remove-Item $InstallerSQL"
        )

        userData.addCommands(
            "New-LocalUser 'allerops' -FullName 'AllerOps' -Description 'Aller Ops User' -NoPassword",
            "Set-LocalUser -Name 'allerops' -PasswordNeverExpires:$true",
            "Add-LocalGroupMember -Group Administrators -Member allerops",
            "New-LocalUser 'easyflow' -FullName 'Easyflow' -Description 'Easyflow User' -NoPassword",
            "Set-LocalUser -Name 'easyflow' -PasswordNeverExpires:$true",
            "Add-LocalGroupMember -Group Administrators -Member easyflow"
        );

        userData.addCommands(
            "New-Partition -DiskNumber 1 -UseMaximumSize | Format-Volume -FileSystem NTFS -NewFileSystemLabel 'Data01'",
            "Get-Partition -DiskNumber 2 -PartitionNumber 2 | Set-Partition -NewDriveLetter G"
        )


        userData.addCommands(
            "Rename-Computer -NewName " + props.instanceName + " -Restart"
        );




        const server = new Instance(this, "adminServer", {
            vpc: props.vpc,
            instanceName: props.instanceName + '-' +props.environment,
            instanceType: InstanceType.of(props.instanceClass, props.instanceSize),
            machineImage: serverAmi,
            securityGroup: serverSecurityGroup,
            vpcSubnets: { subnetType: SubnetType.PUBLIC },
            userDataCausesReplacement: true,
            blockDevices: [
                {
                    deviceName: '/dev/sda1',
                    volume: BlockDeviceVolume.ebs(
                        props.instanceRootSize,
                        {
                            deleteOnTermination: props.protectServer,
                            volumeType: EbsDeviceVolumeType.GP3,
                            encrypted: true,
                        }),
                },
                {
                    deviceName: '/dev/xvdf',
                    volume: BlockDeviceVolume.ebs(
                        props.instanceDatadiskSize,
                        {
                            deleteOnTermination: !props.protectServer,
                            volumeType: EbsDeviceVolumeType.GP3,
                            encrypted: true,
                        }),
                },
            ],
            role: instanceRole,
            userData: userData,
        });
        Tags.of(server).add('Environment', props.environment);
        Tags.of(server).add('Project', props.projectDescription + "-" + props.serverRole);
        Tags.of(server).add('ServerRole', props.serverRole);
        Tags.of(server).add('OS', 'WindowsServer');
        Tags.of(server).add('Backup', props.backup);

        // EC2 Instance <> EIP
        let ec2Assoc = new CfnEIPAssociation(this, "Ec2Association-" + props.environment, {
            eip: serverEip.ref,
            instanceId: server.instanceId
        });

// LoadBalancer
        const cert = Certificate.fromCertificateArn(this, 'loadbalancer-certificate', props.certificateArn);

        const loadbalancer = new ApplicationLoadBalancer(this, 'lb-' + props.environment, {
            vpc: props.vpc,
            deletionProtection: props.protectServer,
            http2Enabled: true,
            idleTimeout: Duration.seconds(30),
            internetFacing: true,
            ipAddressType: IpAddressType.IPV4,
            securityGroup: privateSecurityGroup,
        });
        Tags.of(loadbalancer).add('Environment', props.environment);
        Tags.of(loadbalancer).add('Project', props.projectDescription + "-" + props.environment);


        if(props.internetfacingLoadbalancer) {
            loadbalancer.addSecurityGroup(publicSecurityGroup)
        }

        const httpListener = loadbalancer.addListener('http-'+ props.environment, {
            port: 80,
            open: true,
            protocol: ApplicationProtocol.HTTP,
            defaultAction: ListenerAction.redirect({ permanent: true, port: '443', protocol: ApplicationProtocol.HTTPS, })
        });

        const httpsListener = loadbalancer.addListener('https-'+ props.environment, {
            port: 443,
            open: true,
            certificates: [cert],
            protocol: ApplicationProtocol.HTTPS,
            sslPolicy: SslPolicy.TLS12,
            defaultAction: ListenerAction.fixedResponse(403, {contentType: "text/plain", messageBody: "Forbidden"}),
        });

        const targetGroup = new ApplicationTargetGroup(this, 'targetGroup'+ props.environment,{
            vpc: props.vpc,
            protocol: ApplicationProtocol.HTTP,
            targetType: TargetType.INSTANCE,
            healthCheck: {
                path: '/',
                interval: Duration.seconds(30),
                protocol: Protocol.HTTP,
                enabled: true,
            },
            targets: [new InstanceTarget(server, 80)]
        })
        httpsListener.addAction('redirect'+ props.environment, {
            priority: 10,
            conditions: [
                ListenerCondition.hostHeaders([props.apexDomain])
            ],
            action: ListenerAction.forward([targetGroup])
        });

        // Redirects
        httpsListener.addAction('wwwRedirect'+ props.environment, {
            priority: 50,
            conditions: [
                ListenerCondition.hostHeaders(['www.*'])
            ],
            action: ListenerAction.redirect({
                permanent: true,
                host: props.apexDomain,
            })
        });

// RDS
        const rdsServer = new DatabaseInstance(this, 'rdsServer'+ props.environment, {
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
            allocatedStorage: props.rdsAllocatedStorage,
            maxAllocatedStorage: props.rdsMaxAllocatedStorage,
            allowMajorVersionUpgrade: false,
            autoMinorVersionUpgrade: true,
            instanceIdentifier: (props.rdsIdentifier + "-" + props.environment),
            engine: DatabaseInstanceEngine.sqlServerWeb({version: SqlServerEngineVersion.VER_15}),
            multiAz: false,
            backupRetention: Duration.days(0),
            instanceType: InstanceType.of(props.rdsClass, props.rdsSize),
            securityGroups: [serverSecurityGroup],
            credentials: Credentials.fromGeneratedSecret("rdsServer" + props.environment),
            enablePerformanceInsights: true,
            deletionProtection: props.protectServer,
            monitoringInterval: Duration.minutes(1),
            storageEncrypted: true,
        })
        Tags.of(rdsServer).add('Environment', props.environment);
        Tags.of(rdsServer).add('Backup', props.backup);
        Tags.of(server).add('Project', props.projectDescription);

    }
}