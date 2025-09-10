#include <iostream>
#include <string>
using namespace std;

struct IssueDate {
    int dd, yy;
    string mm;
};

// Function to display movies based on industry
void displayMovies() {
    cout << "There are three movie industries available:\n1. Hollywood\n2. Bollywood\n3. Lollywood\n";
    int industry;
    cin >> industry;

    switch (industry) {
        case 1: {
            cout << "HOLLYWOOD Movies:\n";
            cout << "1. Forrest Gump\tHero: Tom Hanks\n";
            cout << "2. The Dark Knight\tHero: Christian Bale\n";
            cout << "3. Iron Man\tHero: Robert Downey Jr.\n";
            cout << "4. The Matrix\tHero: Keanu Reeves\n";
            cout << "5. Gladiator\tHero: Russell Crowe\n";
            int movie;
            cin >> movie;
            switch (movie) {
                case 1: cout << "You selected Forrest Gump\n"; break;
                case 2: cout << "You selected The Dark Knight\n"; break;
                case 3: cout << "You selected Iron Man\n"; break;
                case 4: cout << "You selected The Matrix\n"; break;
                case 5: cout << "You selected Gladiator\n"; break;
                default: cout << "Invalid selection\n"; break;
            }
            break;
        }
        case 2: {
            cout << "BOLLYWOOD Movies:\n";
            cout << "1. Dangal\tHero: Aamir Khan\n";
            cout << "2. Bajrangi Bhaijaan\tHero: Salman Khan\n";
            cout << "3. Padmaavat\tHero: Ranveer Singh\n";
            cout << "4. 3 Idiots\tHero: Aamir Khan\n";
            cout << "5. Kabir Singh\tHero: Shahid Kapoor\n";
            int movie;
            cin >> movie;
            switch (movie) {
                case 1: cout << "You selected Dangal\n"; break;
                case 2: cout << "You selected Bajrangi Bhaijaan\n"; break;
                case 3: cout << "You selected Padmaavat\n"; break;
                case 4: cout << "You selected 3 Idiots\n"; break;
                case 5: cout << "You selected Kabir Singh\n"; break;
                default: cout << "Invalid selection\n"; break;
            }
            break;
        }
        case 3: {
            cout << "LOLLYWOOD Movies:\n";
            cout << "1. Actor in Law\tHero: Fahad Mustafa\n";
            cout << "2. Jawani Phir Nahi Ani\tHero: Humayun Saeed\n";
            cout << "3. Teefa in Trouble\tHero: Ali Zafar\n";
            cout << "4. Punjab Nahi Jaungi\tHero: Humayun Saeed\n";
            cout << "5. Bin Roye\tHero: Humayun Saeed\n";
            int movie;
            cin >> movie;
            switch (movie) {
                case 1: cout << "You selected Actor in Law\n"; break;
                case 2: cout << "You selected Jawani Phir Nahi Ani\n"; break;
                case 3: cout << "You selected Teefa in Trouble\n"; break;
                case 4: cout << "You selected Punjab Nahi Jaungi\n"; break;
                case 5: cout << "You selected Bin Roye\n"; break;
                default: cout << "Invalid selection\n"; break;
            }
            break;
        }
        default: 
            cout << "Invalid industry selection\n";
            break;
    }
}

// Function for purchase or issue process
void handleTransaction() {
    IssueDate date;
    cout << "What do you want to do?\n1. Purchase\n2. Issue\n";
    int choice;
    cin >> choice;

    switch (choice) {
        case 1:
            cout << "The price of all movies is $500\n";
            break;
        case 2:
            cout << "Enter the issuing date (dd mm yyyy): ";
            cin >> date.dd >> date.mm >> date.yy;
            cout << "Issue Date: " << date.dd << "/" << date.mm << "/" << date.yy << endl;
            cout << "Due Date: " << date.dd + 3 << "/" << date.mm << "/" << date.yy << endl;

            int receivedDate;
            cout << "Enter received date (day only): ";
            cin >> receivedDate;

            if (receivedDate <= date.dd + 3) {
                cout << "No penalty.\n";
            } else {
                cout << "Late return penalty: $" << (receivedDate - (date.dd + 3)) * 50 << endl;
            }
            break;
        default:
            cout << "Invalid choice\n";
            break;
    }
}

int main() {
    cout << " __________________________\n";
    cout << "      Video Rental Shop\n";
    cout << " __________________________\n\n";

    displayMovies();
    handleTransaction();

    return 0;
}
