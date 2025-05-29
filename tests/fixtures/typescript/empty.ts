// Empty file without any tracking events
class AppUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };

  constructor(id: number, name: string, email: string, isActive: boolean = true, preferences?: AppUser['preferences']) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.isActive = isActive;
    this.preferences = preferences;
  }

  deactivate(): void {
    this.isActive = false;
  }

  updateEmail(newEmail: string): void {
    this.email = newEmail;
  }
}

class UserService {
  private users: AppUser[] = [];

  constructor() {
    this.users = [];
  }

  addUser(user: AppUser): void {
    this.users.push(user);
  }

  getUserById(id: number): AppUser | undefined {
    return this.users.find(user => user.id === id);
  }

  updateUserPreferences(userId: number, preferences: AppUser['preferences']): boolean {
    const user = this.getUserById(userId);
    if (user) {
      user.preferences = preferences;
      return true;
    }
    return false;
  }
}

// Example usage
const userService = new UserService();

const newUser = new AppUser(1, "John Doe", "john@example.com", true, {
  theme: "dark",
  notifications: true
});

userService.addUser(newUser);
