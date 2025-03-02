import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createIoTThing } from './helpers/iot-factory'; // Import the factory function

export class IotCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const GPSThingName = 'GPSThing'
    const ENVThingName = 'ENVThing'
    const HEAThingName = 'HEAThing'
    const TestThingName = 'TestThing'
    const policyName = 'IoTDevicePolicy-'

    createIoTThing(this, GPSThingName, (policyName + GPSThingName), cdk.Stack.of(this).region);
    createIoTThing(this, ENVThingName, (policyName + ENVThingName), cdk.Stack.of(this).region);
    createIoTThing(this, HEAThingName, (policyName + HEAThingName), cdk.Stack.of(this).region);
    createIoTThing(this, TestThingName, (policyName + TestThingName), cdk.Stack.of(this).region);
  }
}
