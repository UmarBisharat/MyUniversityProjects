import java.util.*;

class SongNode {
    String songName;
    SongNode next;

    public SongNode(String songName) {
        this.songName = songName;
        this.next = null;
    }
}

class SongLinkedList {
    private SongNode head;
    private int size;

    public SongLinkedList() {
        this.head = null;
        this.size = 0;
    }

    public void addSong(String songName) {
        SongNode newNode = new SongNode(songName);

        if(head == null) {
            head = newNode;
        } else {
            SongNode temp = head;
            while(temp.next != null) {
                temp = temp.next;
            }
            temp.next = newNode;
        }
        size++;
    }

    public void displaySongs() {
        if(head == null) {
            System.out.println("No songs found!");
            return;
        }

        SongNode current = head;
        int count = 1;
        while(current != null) {
            System.out.println("   " + count + ". " + current.songName);
            current = current.next;
            count++;
        }
    }

    public boolean searchSong(String songName) {
        SongNode current = head;
        while(current != null) {
            if(current.songName.equalsIgnoreCase(songName)) {
                return true;
            }
            current = current.next;
        }
        return false;
    }

    public int getSize() {
        return size;
    }


    public List<String> getAllSongs() {
        List<String> songs = new ArrayList<>();
        SongNode current = head;
        while(current != null) {
            songs.add(current.songName);
            current = current.next;
        }
        return songs;
    }
}

public class BollywoodSongsExplorer {

    private HashMap<String, SongLinkedList> singerSongsMap;

    public BollywoodSongsExplorer() {
        singerSongsMap = new HashMap<>();
        loadSampleData();
    }


    private void loadSampleData() {
        // Arijit Singh songs
        addSong("Arijit Singh", "Kesariya");
        addSong("Arijit Singh", "Tum Hi Ho");
        addSong("Arijit Singh", "Channa Mereya");
        addSong("Arijit Singh", "Ae Dil Hai Mushkil");
        addSong("Arijit Singh", "Raabta");
        addSong("Arijit Singh", "Hawayein");

        // Shreya Ghoshal songs
        addSong("Shreya Ghoshal", "Teri Ore");
        addSong("Shreya Ghoshal", "Sun Raha Hai");
        addSong("Shreya Ghoshal", "Nagada Sang Dhol");
        addSong("Shreya Ghoshal", "Manwa Laage");

        // Atif Aslam songs
        addSong("Atif Aslam", "Jeene Laga Hoon");
        addSong("Atif Aslam", "Dil Diyan Gallan");
        addSong("Atif Aslam", "Tera Hone Laga Hoon");

        // Neha Kakkar songs
        addSong("Neha Kakkar", "Dilbar");
        addSong("Neha Kakkar", "Kala Chashma");
        addSong("Neha Kakkar", "Aankh Marey");
        addSong("Neha Kakkar", "Garmi");

        // Sonu Nigam songs
        addSong("Sonu Nigam", "Abhi Mujh Mein Kahin");
        addSong("Sonu Nigam", "Suraj Hua Maddham");
        addSong("Sonu Nigam", "Kal Ho Naa Ho");
    }

    public void addSong(String singerName, String songName) {

        if(!singerSongsMap.containsKey(singerName)) {
            singerSongsMap.put(singerName, new SongLinkedList());
        }

        singerSongsMap.get(singerName).addSong(songName);
    }

    // Question 1: Find all songs by Arijit Singh
    public void findSongsBySinger(String singerName) {
        System.out.println("\n========================================");
        System.out.println("SONGS BY " + singerName.toUpperCase());
        System.out.println("========================================");

        if(singerSongsMap.containsKey(singerName)) {
            singerSongsMap.get(singerName).displaySongs();
        } else {
            System.out.println("Singer not found in database!");
        }
        System.out.println("========================================\n");
    }

    // Question 2: Count songs by Shreya Ghoshal
    public void countSongsBySinger(String singerName) {
        System.out.println("\n========================================");
        System.out.println("SONG COUNT FOR " + singerName.toUpperCase());
        System.out.println("========================================");

        if(singerSongsMap.containsKey(singerName)) {
            int count = singerSongsMap.get(singerName).getSize();
            System.out.println(singerName + " has sung " + count + " songs.");
        } else {
            System.out.println("Singer not found in database!");
        }
        System.out.println("========================================\n");
    }

    // Question 3: List all singers and their song counts
    public void listAllSingersWithCount() {
        System.out.println("\n========================================");
        System.out.println("ALL SINGERS AND THEIR SONG COUNTS");
        System.out.println("========================================");

        if(singerSongsMap.isEmpty()) {
            System.out.println("No data available!");
            return;
        }

        int serial = 1;
        for(String singer : singerSongsMap.keySet()) {
            int songCount = singerSongsMap.get(singer).getSize();
            System.out.println(serial + ". " + singer + " - " + songCount + " songs");
            serial++;
        }
        System.out.println("========================================\n");
    }

    // Question 4: Search if a specific song is sung by a given singer
    public void searchSongBySinger(String songName, String singerName) {
        System.out.println("\n========================================");
        System.out.println("SEARCHING: '" + songName + "' by " + singerName);
        System.out.println("========================================");

        if(!singerSongsMap.containsKey(singerName)) {
            System.out.println("Singer not found!");
        } else {
            boolean found = singerSongsMap.get(singerName).searchSong(songName);
            if(found) {
                System.out.println("✓ Yes! '" + songName + "' is sung by " + singerName);
            } else {
                System.out.println("✗ No, '" + songName + "' is not found in " + singerName + "'s songs");
            }
        }
        System.out.println("========================================\n");
    }

    // Question 5: Display all songs in order using LinkedList traversal
    public void displayAllSongsInOrder(String singerName) {
        System.out.println("\n========================================");
        System.out.println("ALL SONGS BY " + singerName.toUpperCase() + " (IN ORDER)");
        System.out.println("========================================");

        if(singerSongsMap.containsKey(singerName)) {
            singerSongsMap.get(singerName).displaySongs();
        } else {
            System.out.println("Singer not found in database!");
        }
        System.out.println("========================================\n");
    }

    public void showMenu() {
        Scanner sc = new Scanner(System.in);
        int choice;

        do {
            System.out.println("\n╔════════════════════════════════════════════╗");
            System.out.println("║  BOLLYWOOD SPOTIFY SONGS EXPLORER 2024     ║");
            System.out.println("╚════════════════════════════════════════════╝");
            System.out.println("1. Find all songs by Arijit Singh");
            System.out.println("2. Count songs by Shreya Ghoshal");
            System.out.println("3. List all singers with song counts");
            System.out.println("4. Search if a song is sung by a singer");
            System.out.println("5. Display all songs of a singer (ordered)");
            System.out.println("6. Exit");
            System.out.print("\nEnter your choice: ");

            choice = sc.nextInt();
            sc.nextLine();
            switch(choice) {
                case 1:
                    findSongsBySinger("Arijit Singh");
                    break;

                case 2:
                    countSongsBySinger("Shreya Ghoshal");
                    break;

                case 3:
                    listAllSingersWithCount();
                    break;

                case 4:
                    System.out.print("Enter song name: ");
                    String song = sc.nextLine();
                    System.out.print("Enter singer name: ");
                    String singer = sc.nextLine();
                    searchSongBySinger(song, singer);
                    break;

                case 5:
                    System.out.print("Enter singer name: ");
                    String singerName = sc.nextLine();
                    displayAllSongsInOrder(singerName);
                    break;

                case 6:
                    System.out.println("\nThank you for using Bollywood Songs Explorer!");
                    System.out.println("Goodbye! 🎵");
                    break;

                default:
                    System.out.println("Invalid choice! Please try again.");
            }

        } while(choice != 6);

        sc.close();
    }

    public static void main(String[] args) {
        BollywoodSongsExplorer explorer = new BollywoodSongsExplorer();
        explorer.showMenu();
    }
}
