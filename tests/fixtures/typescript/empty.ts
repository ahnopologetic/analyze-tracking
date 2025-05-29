// Empty file without any tracking events
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class UserService {
  private users: User[] = [];

  constructor() {
    this.users = [];
  }

  addUser(user: User): void {
    this.users.push(user);
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  updateUserPreferences(userId: number, preferences: User['preferences']): boolean {
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

const newUser: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  isActive: true,
  preferences: {
    theme: "dark",
    notifications: true
  }
};

userService.addUser(newUser);
