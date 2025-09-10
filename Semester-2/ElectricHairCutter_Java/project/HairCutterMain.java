package project;

import java.util.Scanner;

public class HairCutterMain {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Battery battery = new Battery(100);
        ElectricHairCutter hairCutter = new ElectricHairCutter("Panasonic", battery);

        while (true) {
            System.out.println("\nElectric Hair Cutter Menu:");
            System.out.println("1. Turn ON");
            System.out.println("2. Turn OFF");
            System.out.println("3. Operate");
            System.out.println("4. Adjust Blade Length");
            System.out.println("5. Recharge Battery");
            System.out.println("6. Exit");
            System.out.print("Choose an option (1-6): ");

            int choice = scanner.nextInt();
            scanner.nextLine(); // consume newline

            switch (choice) {
                case 1:
                    hairCutter.turnOn();
                    hairCutter.startMonitoring();
                    hairCutter.startOperation();
                    break;
                case 2:
                    hairCutter.turnOff();
                    break;
                case 3:
                    hairCutter.operate();
                    break;
                case 4:
                    System.out.print("Enter blade length (1-10 mm): ");
                    try {
                        int length = Integer.parseInt(scanner.nextLine());
                        hairCutter.adjustBladeLength(length);
                    } catch (NumberFormatException e) {
                        System.out.println("Invalid input. Please enter a number.");
                    }
                    break;
                case 5:
                    battery.recharge();
                    hairCutter.logOperation("Battery recharged to 100%");
                    System.out.println("Battery recharged to 100%");
                    break;
                case 6:
                    System.out.println("Exiting...");
                    scanner.close();
                    System.exit(0);
                default:
                    System.out.println("Invalid option. Try again.");
            }
        }
    }
}
