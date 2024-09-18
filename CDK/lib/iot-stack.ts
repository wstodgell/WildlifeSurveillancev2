import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createIoTThing } from './helpers/iot-factory'; // Import the factory function

export class IotCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Pass the bucket into the createIoTThing function
    createIoTThing(this, 'GPSThing', 'IoTDevicePolicy-GPS', cdk.Stack.of(this).region);
    createIoTThing(this, 'TestThing', 'IoTDevicePolicy-Test', cdk.Stack.of(this).region);
  }
}
