#include <ESP8266WiFi.h>

const char* ssid = "Iphone (Sasha)"; // Replace with your WiFi SSID
const char* password = "sashakraeva1"; // Replace with your WiFi password

const char* serverUrl = "https://xref-my-lockation-tracker-ffdc2f2f433d.herokuapp.com"; // Replace with your server's URL
const int httpPort = 80; // or 443 for HTTPS

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


  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
}


void loop() {
  float lux = lightMeter.readLightLevel(); // Read light level in lux
  Serial.print("Light: ");
  Serial.print(lux);
  Serial.println(" lx");

  // Display the light level on the TM1637
  int displayValue = (int)lux; // Convert lux to an integer value for display
  display.showNumberDec(displayValue, false); // Display the value, with leading zeros disabled

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    if (client.connect(serverUrl, httpPort)) {
      String url = "/api/lux"; // API endpoint for sending lux values
      client.print(String("POST ") + url + " HTTP/1.1\r\n" +
                   "Host: " + serverUrl + "\r\n" +
                   "Content-Type: application/x-www-form-urlencoded\r\n" +
                   "Connection: close\r\n" +
                   "Content-Length: " + String(String("lux=").length() + String(lux).length()) + "\r\n" +
                   "\r\n" +
                   "lux=" + String(lux));
    }
  }

  delay(10000); // Adjust based on your needs
}
