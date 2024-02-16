#include <Wire.h>
#include <BH1750.h>
#include <TM1637Display.h>

// Define TM1637 connections pins
#define CLK D5
#define DIO D6

// Create display object of type TM1637Display
TM1637Display display(CLK, DIO);

// Initialize the BH1750 object
BH1750 lightMeter;

void setup() {
  Serial.begin(9600);
  Wire.begin(); // Initialize I2C
  lightMeter.begin(); // Initialize BH1750

  display.setBrightness(0x0f); // Set the display to maximum brightness
  Serial.println(F("BH1750 and TM1637 Integration Test"));
}

void loop() {
  float lux = lightMeter.readLightLevel(); // Read light level in lux
  Serial.print("Light: ");
  Serial.print(lux);
  Serial.println(" lx");

  // Display the light level on the TM1637
  int displayValue = (int)lux; // Convert lux to an integer value for display
  display.showNumberDec(displayValue, false); // Display the value, with leading zeros disabled

  delay(1000); // Update the display every second
}
