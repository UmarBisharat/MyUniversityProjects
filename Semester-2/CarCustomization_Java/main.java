import java.util.Scanner;

// Base Car class
class Car {
    String model;
    long price;

    public void showDetails() {
        System.out.println("Model: " + model);
        System.out.println("Base Price: " + price + " PKR");
    }
}

// Subclasses for different car models
class EClass extends Car {
    public EClass(String type) {
        model = "E-Class";
        price = type.equalsIgnoreCase("new") ? 25000000 : 15000000;
    }
}

class SClass extends Car {
    public SClass(String type) {
        model = "S-Class";
        price = type.equalsIgnoreCase("new") ? 45000000 : 25000000;
    }
}

class GWagon extends Car {
    public GWagon(String type) {
        model = "G-Wagon";
        price = type.equalsIgnoreCase("new") ? 80000000 : 50000000;
    }
}

// Modification class for optional upgrades
class Modification {
    long tirePrice = 0;
    long paintPrice = 0;
    long exhaustPrice = 0;

    public void setTire(String tire) {
        switch (tire.toLowerCase()) {
            case "sport tire": tirePrice = 500000; break;
            case "off-road tire": tirePrice = 700000; break;
            case "classic tire": tirePrice = 300000; break;
        }
    }

    public void setPaint(String paint) {
        if (paint.equalsIgnoreCase("Black") ||
            paint.equalsIgnoreCase("White") ||
            paint.equalsIgnoreCase("Metallic Silver")) {
            paintPrice = 1000000;
        }
    }

    public void setExhaust(String exhaust) {
        if (exhaust.equalsIgnoreCase("yes")) exhaustPrice = 800000;
    }

    public long getTotalModificationPrice() {
        return tirePrice + paintPrice + exhaustPrice;
    }

    public void showMods() {
        System.out.println("Tire Price: " + tirePrice + " PKR");
        System.out.println("Paint Price: " + paintPrice + " PKR");
        System.out.println("Exhaust Price: " + exhaustPrice + " PKR");
    }
}

// Showroom class simulating preparation using threads
class Showroom extends Thread {
    Car car;
    Modification mod;

    Showroom(Car car, Modification mod) {
        this.car = car;
        this.mod = mod;
    }

    @Override
    public void run() {
        try {
            System.out.println("\nPreparing your car... Please wait...");
            Thread.sleep(3000); // simulate preparation
            car.showDetails();
            mod.showMods();
            System.out.println("Total Price: " + (car.price + mod.getTotalModificationPrice()) + " PKR");
            System.out.println("Your car is ready!\n");
        } catch (InterruptedException e) {
            System.out.println("Something went wrong!");
        }
    }
}

// Main class
public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.print("Do you want a new or used car? ");
        String type = input.nextLine();

        System.out.println("Available Models: E-Class, S-Class, G-Wagon");
        System.out.print("Which model do you want? ");
        String model = input.nextLine();

        Car selectedCar;
        switch (model.toLowerCase()) {
            case "e-class": selectedCar = new EClass(type); break;
            case "s-class": selectedCar = new SClass(type); break;
            case "g-wagon": selectedCar = new GWagon(type); break;
            default:
                System.out.println("Invalid model! Defaulting to E-Class.");
                selectedCar = new EClass(type);
        }

        Modification mod = new Modification();
        System.out.print("Do you want to modify your car? (yes/no): ");
        String modify = input.nextLine();

        if (modify.equalsIgnoreCase("yes")) {
            System.out.println("Choose Tire: Sport Tire, Off-Road Tire, Classic Tire");
            mod.setTire(input.nextLine());

            System.out.println("Choose Paint: Black, White, Metallic Silver");
            mod.setPaint(input.nextLine());

            System.out.print("Do you want Sport Exhaust? (yes/no): ");
            mod.setExhaust(input.nextLine());
        }

        Showroom showroom = new Showroom(selectedCar, mod);
        showroom.start();
    }
}
