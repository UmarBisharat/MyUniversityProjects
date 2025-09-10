package project;

import java.util.concurrent.locks.ReentrantLock;

public class ElectricHairCutter extends Appliance {
    private Blade blade;
    private Motor motor;
    private Battery battery;
    private int bladeLength;
    private final ReentrantLock lock = new ReentrantLock();

    public ElectricHairCutter(String brand, Battery battery) {
        super(brand);
        this.blade = new Blade();
        this.motor = new Motor();
        this.battery = battery;
        this.bladeLength = 1;
    }

    @Override
    public void operate() {
        lock.lock();
        try {
            if (isOn && battery.getChargeLevel() > 0) {
                motor.setSpeed(50);
                motor.run();
                blade.useBlade();
                battery.consumeCharge(5);
                logOperation("Hair cutter operating, blade length: " + bladeLength + "mm, battery: " + battery.getChargeLevel() + "%");
                System.out.println("Cutting hair with blade length: " + bladeLength + "mm");
            } else {
                System.out.println("Cannot operate: " + (isOn ? "Battery depleted" : "Device is OFF"));
                logOperation("Operation failed: " + (isOn ? "Battery depleted" : "Device is OFF"));
            }
        } finally {
            lock.unlock();
        }
    }

    public void adjustBladeLength(int length) {
        lock.lock();
        try {
            if (length >= 1 && length <= 10) {
                this.bladeLength = length;
                logOperation("Blade length adjusted to " + length + "mm");
                System.out.println("Blade length set to: " + length + "mm");
            } else {
                System.out.println("Invalid blade length. Must be between 1 and 10 mm.");
            }
        } finally {
            lock.unlock();
        }
    }

    public void startMonitoring() {
        Thread monitorThread = new Thread(() -> {
            while (isOn) {
                lock.lock();
                try {
                    System.out.println("Status - Battery: " + battery.getChargeLevel() + "%, Blade Sharpness: " + blade.getSharpnessLevel() + "%, Motor Speed: " + motor.getSpeed());
                    logOperation("Status - Battery: " + battery.getChargeLevel() + "%, Blade Sharpness: " + blade.getSharpnessLevel() + "%");
                } finally {
                    lock.unlock();
                }
                try {
                    Thread.sleep(5000);
                } catch (InterruptedException e) {
                    logOperation("Monitoring interrupted: " + e.getMessage());
                    Thread.currentThread().interrupt();
                }
            }
        });
        monitorThread.start();
    }

    public void startOperation() {
        Thread operationThread = new Thread(() -> {
            while (isOn && battery.getChargeLevel() > 0) {
                operate();
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException e) {
                    logOperation("Operation interrupted: " + e.getMessage());
                    Thread.currentThread().interrupt();
                }
            }
        });
        operationThread.start();
    }
}
