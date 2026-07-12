import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import type { Construct } from "constructs";
import { namer } from "../naming.js";

export class GlobalStack extends Stack {
  readonly certificate: Certificate;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.certificate = new Certificate(this, "Certificate", {
      certificateName: namer().global("aprovan-com"),
      domainName: "aprovan.com",
      subjectAlternativeNames: ["*.aprovan.com"],
      validation: CertificateValidation.fromDns(),
    });
    new CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
    });
  }
}
