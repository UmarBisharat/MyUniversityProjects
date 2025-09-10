package project;

public class Battery {
    private int chargeLevel;

    public Battery(int chargeLevel) {
        this.chargeLevel = chargeLevel;
    }

    public int getChargeLevel() {
        return chargeLevel;
    }

    public void consumeCharge(int amount) {
        chargeLevel -= amount;
        if (chargeLevel < 0) chargeLevel = 0;
    }

    public void recharge() {
        chargeLevel = 100;
    }
}
