package project;

public class Blade {
    private int sharpnessLevel;

    public Blade() {
        this.sharpnessLevel = 100; // 100% sharpness initially
    }

    public int getSharpnessLevel() {
        return sharpnessLevel;
    }

    public void setSharpnessLevel(int sharpnessLevel) {
        if (sharpnessLevel >= 0 && sharpnessLevel <= 100) {
            this.sharpnessLevel = sharpnessLevel;
        }
    }

    public void useBlade() {
        if (sharpnessLevel > 0) {
            sharpnessLevel -= 10;
            if (sharpnessLevel < 0) sharpnessLevel = 0;
        }
    }
}
