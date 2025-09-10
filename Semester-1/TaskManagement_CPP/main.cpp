#include <iostream>
#include <vector>
#include <string>
#include <fstream>
using namespace std;

struct Assignee {
    string id, name, email, phone;
};

struct Task {
    string id, name, assigneeId, status;
};

struct ChecklistItem {
    string taskId, description;
    bool isCompleted;
};

// Global vectors to store data
vector<Assignee> assignees;
vector<Task> tasks;
vector<ChecklistItem> checklistItems;

// Function to add assignee
void addAssignee() {
    Assignee a;
    cout << "Enter Assignee ID: ";
    cin >> a.id;
    cout << "Enter Assignee Name: ";
    cin.ignore();
    getline(cin, a.name);
    cout << "Enter Assignee Email: ";
    cin >> a.email;
    cout << "Enter Assignee Phone: ";
    cin >> a.phone;

    assignees.push_back(a);
    cout << "Assignee Added Successfully.\n";
}

// Function to add task
void addTask() {
    Task t;
    cout << "Enter Task ID: ";
    cin >> t.id;
    cout << "Enter Task Name: ";
    cin.ignore();
    getline(cin, t.name);
    cout << "Enter Assignee ID: ";
    cin >> t.assigneeId;
    cout << "Enter Task Status (Pending/In Progress/Completed): ";
    cin >> t.status;

    tasks.push_back(t);
    cout << "Task Added Successfully.\n";
}

// Function to add checklist item
void addChecklistItem() {
    ChecklistItem c;
    cout << "Enter Task ID: ";
    cin >> c.taskId;
    cout << "Enter Checklist Description: ";
    cin.ignore();
    getline(cin, c.description);
    c.isCompleted = false;

    checklistItems.push_back(c);
    cout << "Checklist Item Added Successfully.\n";
}

// Function to mark checklist item as completed
void markChecklistCompleted() {
    string taskId, desc;
    cout << "Enter Task ID: ";
    cin >> taskId;
    cout << "Enter Checklist Description: ";
    cin.ignore();
    getline(cin, desc);

    bool found = false;
    for (auto &item : checklistItems) {
        if (item.taskId == taskId && item.description == desc) {
            item.isCompleted = true;
            cout << "Checklist Item Marked as Completed.\n";
            found = true;
            break;
        }
    }
    if (!found) {
        cout << "Checklist Item Not Found.\n";
    }
}

// Function to display all assignees
void displayAssignees() {
    for (const auto &a : assignees) {
        cout << "ID: " << a.id << ", Name: " << a.name
             << ", Email: " << a.email << ", Phone: " << a.phone << endl;
    }
}

// Function to display all tasks
void displayTasks() {
    for (const auto &t : tasks) {
        cout << "Task ID: " << t.id << ", Name: " << t.name
             << ", Assignee ID: " << t.assigneeId << ", Status: " << t.status << endl;
    }
}

// Function to generate reports for all assignees
void generateReport() {
    for (const auto &a : assignees) {
        ofstream file(a.id + "_report.txt");
        file << "Assignee ID: " << a.id << endl;
        file << "Name: " << a.name << endl;
        file << "Email: " << a.email << endl;
        file << "Phone: " << a.phone << endl << endl;

        file << "Tasks:\n";
        for (const auto &t : tasks) {
            if (t.assigneeId == a.id) {
                file << "- Task ID: " << t.id << ", Name: " << t.name
                     << ", Status: " << t.status << endl;
                file << "  Checklist Items:\n";
                for (const auto &c : checklistItems) {
                    if (c.taskId == t.id) {
                        file << "   - " << c.description
                             << " [" << (c.isCompleted ? "Completed" : "Pending") << "]\n";
                    }
                }
            }
        }
        file.close();
        cout << "Report Generated for Assignee: " << a.name << endl;
    }
}

// Menu function
void menu() {
    int choice;
    do {
        cout << "\n===========================================\n";
        cout << "      Welcome to Task Management System    \n";
        cout << "===========================================\n";
        cout << "1. Add Assignee\n";
        cout << "2. Add Task\n";
        cout << "3. Add Checklist Item\n";
        cout << "4. Mark Checklist Item Completed\n";
        cout << "5. View Assignees\n";
        cout << "6. View Tasks\n";
        cout << "7. Generate Reports\n";
        cout << "8. Exit\n";
        cout << "Enter your choice: ";
        cin >> choice;

        switch (choice) {
            case 1: addAssignee(); break;
            case 2: addTask(); break;
            case 3: addChecklistItem(); break;
            case 4: markChecklistCompleted(); break;
            case 5: displayAssignees(); break;
            case 6: displayTasks(); break;
            case 7: generateReport(); break;
            case 8: cout << "Exiting Program.\n"; break;
            default: cout << "Invalid Choice! Try Again.\n"; break;
        }
    } while (choice != 8);
}

int main() {
    menu();
    return 0;
}
