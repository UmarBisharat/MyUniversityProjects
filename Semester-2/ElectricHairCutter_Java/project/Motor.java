package project;

public class Motor {
    private int speed;

    public Motor() {
        this.speed = 0;
    }

    public int getSpeed() {
        return speed;
    }

    public void setSpeed(int speed) {
        if (speed >= 0 && speed <= 100) {
            this.speed = speed;
        }
    }

    public void run() {
        if (speed > 0) {
            System.out.println("Motor running at speed: " + speed);
        }
    }
}
