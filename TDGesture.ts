let GI_AIRWHEEL_CW = 90
let GI_AIRWHEEL_CCW = 91

/*可选引脚*/
enum chooseD {
    //% block="P0"
    P0 = DigitalPin.P0,
    //% block="P1"
    P1 = DigitalPin.P1,
    //% block="P2"
    P2 = DigitalPin.P2,
    //% block="P3"
    P3 = DigitalPin.P3,
    //% block="P4"
    P4 = DigitalPin.P4,
    //% block="P5"
    P5 = DigitalPin.P5,
    //% block="P6"
    P6 = DigitalPin.P6,
    //% block="P7"
    P7 = DigitalPin.P7,
    //% block="P8"
    P8 = DigitalPin.P8,
    //% block="P9"
    P9 = DigitalPin.P9,
    //% block="P10"
    P10 = DigitalPin.P10,
    //% block="P11"
    P11 = DigitalPin.P11,
    //% block="P12"
    P12 = DigitalPin.P12,
    //% block="P13"
    P13 = DigitalPin.P13,
    //% block="P14"
    P14 = DigitalPin.P14,
    //% block="P15"
    P15 = DigitalPin.P15,
    //% block="P16"
    P16 = DigitalPin.P16,
    //% block="P19"
    P19 = DigitalPin.P19,
    //% block="P20"
    P20 = DigitalPin.P20
}
enum whichPose {
    //% block="Up"
    Up = 4,
    //% block="Down"
    Down = 5,
    //% block="Left"
    Left = 3,
    //% block="Right"
    Right = 2,
    //% block="CW"
    CW = GI_AIRWHEEL_CW,
    //% block="CCW"
    CCW = GI_AIRWHEEL_CCW
}

//% weight=10 color=#008B00 icon="\uf137" block="TDGesture"
namespace TDGesture {

    let MSGID_SENSORDATAOUT = 0x91
    //StreamingOutput Mask (DataOutputConfig), bitmask, 2Bytes
    let STREAMOUT_DSPINFO = 0x0001               //b0 : DSPInfo field
    let STREAMOUT_GESTUREINFO = 0x0002               //b1 : GestureInfo field
    let STREAMOUT_TOUCHINFO = 0x0004               //b2 : TouchInfo field
    let STREAMOUT_AIRWHEELINFO = 0x0008               //b3 : AirWheelInfo field
    let STREAMOUT_XYZPOSITION = 0x0010               //b4 : XYZPosition field  
    //Gesture Info 
    let GI_NOGESTURE = 0
    let GI_GARBAGEMOD = 1
    let GI_FLICK_R = 2
    let GI_FLICK_L = 3
    let GI_FLICK_U = 4
    let GI_FLICK_D = 5
    //Tap Bitmask
    let BITSHIFT_TAP_SOUTH = 5
    let BITSHIFT_TAP_WEST = 6
    let BITSHIFT_TAP_NORTH = 7
    let BITSHIFT_TAP_EAST = 8
    let BITSHIFT_TAP_CENTER = 9

    let SI_AIRWHEELVALID = 0x02
    let AirWheelValuePrevious = 0
    let AirWheelActivePrevious = false   // AirWheel status in the previous run

    let AirWheelDiff = 0
    let Status = 0;
    let Update = false;
    let UsePin = chooseD.P0;
    /*3D手势模块*/
    function i2c1_MasterRead(reclength: number, address: number): number {
        /*获取数据到缓冲区*/
        let recbuf = pins.createBuffer(128) //recbuf为全局变量的话只能在function内部使用
        recbuf = pins.i2cReadBuffer(address, reclength, false)//repeated
        //serial.writeBuffer(recbuf)
        /*处理缓冲区数据*/
        /*Extract data from buffer*/
        let streamOutRequired = (STREAMOUT_DSPINFO | STREAMOUT_GESTUREINFO | STREAMOUT_TOUCHINFO | STREAMOUT_AIRWHEELINFO | STREAMOUT_XYZPOSITION);
        let retVal = GI_NOGESTURE
        let header_id = recbuf[3] & 0xFF

        let header_size = recbuf[0] & 0xFF
        let buf_streamingOutputMaask = (recbuf[5] & 0xFF) << 8 | recbuf[4] & 0xFF

        let buf_systemInfo = recbuf[7] & 0xFF

        let buf_airWheelCounter = recbuf[18] & 0xFF

        let buf_gestureInfo = (recbuf[13] & 0xFF) << 24 | (recbuf[12] & 0xFF) << 16 | (recbuf[11] & 0xFF) << 8 | (recbuf[10] & 0xFF)

        if (header_id != MSGID_SENSORDATAOUT) {
            return GI_NOGESTURE
        }
        if (header_size < 22) {
            return GI_NOGESTURE
        }
        if ((buf_streamingOutputMaask & streamOutRequired) == streamOutRequired) {
            /*获取手势信息*/
            retVal = buf_gestureInfo & 0xFF
            /*AIRWHEEL DETECTION*/
            // AirWheel is active and valid if bit1 of SystemInfo is set
            let AirWheelActive = (buf_systemInfo & SI_AIRWHEELVALID) != 0 //0x02
            let AirWheelValueNew = buf_airWheelCounter;
            //store the airwheel counter when the airwheel is started
            if (AirWheelActive && !AirWheelActivePrevious) {
                AirWheelValuePrevious = buf_airWheelCounter
            }
            else if (AirWheelActive) {
                if (AirWheelValuePrevious < 64 && AirWheelValueNew) {
                    AirWheelDiff += ((AirWheelValueNew - 256) - AirWheelValuePrevious)
                }
                else if (AirWheelValuePrevious > 192 && AirWheelValueNew < 64) {
                    AirWheelDiff += ((AirWheelValueNew + 256) - AirWheelValuePrevious)
                }
                else {
                    AirWheelDiff += AirWheelValueNew - AirWheelValuePrevious
                }
                if (AirWheelDiff >= 32) {
                    AirWheelDiff = 0
                    retVal = GI_AIRWHEEL_CW
                }
                else if (AirWheelDiff <= -32) {
                    AirWheelDiff = 0;
                    retVal = GI_AIRWHEEL_CCW;
                }
                else { }
            }
            AirWheelActivePrevious = AirWheelActive    // save the status for the next run
            AirWheelValuePrevious = AirWheelValueNew
        }
        return retVal
    }

    /*3D手势模块*/
    //% weight = 40
    //% blockId=Gesture block="pin(D) %pinD|pin(MCLR) %pinMCLR|Current posture %Pose|?"
    export function Gesture(pinD: chooseD, pinMCLR: chooseD, Pose: whichPose): boolean {
        UsePin = pinD;
        if (Status == Pose) {
            Status = 0;
            return true;
        }
        return false;
    }

    basic.forever(function () {
        let Gespin = pins.digitalReadPin(<number>UsePin)
        //let Gespin = pins.digitalReadPin(DigitalPin.P0)
        if (Gespin == 0) {
            let cmd = i2c1_MasterRead(26, 0x42);
            switch (cmd) {
                case whichPose.CCW:
                case whichPose.CW:
                case whichPose.Down:
                case whichPose.Left:
                case whichPose.Right:
                case whichPose.Up:
                    Status = cmd;
                    break;
                default:
                    break;
            }
        }
    })
}





