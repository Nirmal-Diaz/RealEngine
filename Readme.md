# RealEngine
A physics engine that models several concepts of linear motion

## PREREQUISITES
* Following prerequisite is only needed for real-time acceleration
1. A device with an accelerometer that can be accessed by the "Generic Sensors API"

## HOW TO USE
1. Open the "./RealEngine.html" on any browser
2. Click on "+" button to start adding an object
3. Specify the properties of the object and click confirm
* Properties of an object include
  - Velocity: Used mostly for constant speed(non-accelerating) objects
  - Coefficient of elasticity
  - Object radius
4. The simulation will start right away
* You can add more than one object
5. Use "Global Settings" button to change settings of the simulation
* Global settings include
  - Real-time acceleration: Apply acceleration data from the device's accelerometer to simulation (Device accelerometer required)
  - Custom acceleration: Only useful when real-time acceleration is off
  - Acceleration scale: Since 1pixel maps to a 1meter in real world, 1:1 scale acceleration makes the objects appear moving slowly 