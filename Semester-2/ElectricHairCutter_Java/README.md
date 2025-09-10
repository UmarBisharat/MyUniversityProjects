# ElectricHairCutter_Java

✂ Electric Hair Cutter System (Java OOP Project)

This is my 1st-year, 2nd-semester Java OOP project.
It simulates an electric hair cutter (trimmer) with real-life features such as motor speed, battery usage, blade sharpness, and logging of operations.

🔑 Features

✅ Turn ON / OFF the hair cutter.

✅ Operate the cutter → consumes battery and reduces blade sharpness.

✅ Adjust blade length (1–10 mm) for different haircuts.

✅ Rechargeable battery system (restores to 100%).

✅ Automatic monitoring thread → shows live battery %, blade sharpness, and motor speed every 5 seconds.

✅ Continuous operation thread → cutter works while ON until battery drains.

✅ File logging → every action is saved into hair_cutter_log.txt with a timestamp.


📚 Concepts Practiced

Abstraction → Appliance as abstract parent class.

Encapsulation → Battery, Blade, and Motor classes with private fields.

Inheritance & Polymorphism → ElectricHairCutter extends Appliance.

Multithreading → Monitoring & Operation run in parallel threads.

Synchronization (Locks) → Ensures safe concurrent access to resources.

File Handling → Logs all operations with timestamp in a text file.


🧑‍💻 Personal Note

This project was my most advanced OOP assignment so far.
I felt like building a real smart device simulation where every component (battery, blade, motor) works together.
The use of threads and locks gave me real experience of concurrent programming in Java.
