# TaskManagement_CPP
🗂 Task Management System (C++)

This is my Semester-1 University Project, a console-based Task Management System written in C++.
It allows managing assignees, tasks, and checklist items with simple text-based menus.
The program also generates individual reports for each assignee with their assigned tasks and checklist status.

✨ Features

✅ Add and manage Assignees (ID, Name, Email, Phone)
✅ Add and manage Tasks (ID, Name, Assignee, Status)
✅ Add Checklist Items for each task
✅ Mark checklist items as Completed / Pending
✅ View all Assignees and Tasks
✅ Automatically generate text-based reports for each assignee


🛠 Technologies Used

C++ (core language)

File Handling (fstream) for generating reports

Vectors & Structs for data storage

Console Menu System


📂 Project Structure

TaskManagement_CPP/
 ┣ 📄 main.cpp      # Main program source code
 ┗ 📄 README.md     # Project documentation


🚀 How to Run

1. Compile the code using g++:

g++ main.cpp -o taskmanager


2. Run the program:

./taskmanager


3. Follow the menu options to manage tasks and assignees.


📊 Example Output

===========================================
      Welcome to Task Management System    
===========================================
1. Add Assignee
2. Add Task
3. Add Checklist Item
4. Mark Checklist Item Completed
5. View Assignees
6. View Tasks
7. Generate Reports
8. Exit
Enter your choice:



🎯 Purpose

This project was built in 1st Semester as part of my university learning journey.
It demonstrates understanding of structs, vectors, file handling, and menu-driven programming in C++.
