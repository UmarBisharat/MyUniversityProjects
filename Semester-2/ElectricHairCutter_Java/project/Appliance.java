package project;

import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

public abstract class Appliance {
    protected String brand;
    protected boolean isOn;

    public Appliance(String brand) {
        this.brand = brand;
        this.isOn = false;
    }

    public abstract void operate();

    public void turnOn() {
        isOn = true;
        logOperation("Appliance turned ON");
    }

    public void turnOff() {
        isOn = false;
        logOperation("Appliance turned OFF");
    }

    public boolean isOn() {
        return isOn;
    }

    protected void logOperation(String message) {
        try (FileWriter writer = new FileWriter("hair_cutter_log.txt", true)) {
            String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
            writer.write(timestamp + ": " + message + "\n");
        } catch (IOException e) {
            System.out.println("Error logging operation: " + e.getMessage());
        }
    }
}
