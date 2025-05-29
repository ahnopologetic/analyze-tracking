// Empty file without any tracking events
class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.isActive = true;
  }

  deactivate() {
    this.isActive = false;
  }

  updateEmail(newEmail) {
    this.email = newEmail;
  }
}

// Example usage
const user = new User(1, "John Doe", "john@example.com");
console.log(user);

user.updateEmail("johndoe@example.com");
console.log(user.email); // johndoe@example.com

user.deactivate();
console.log(user.isActive); // false
