// ✅ backend/seedBooks.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "./models/Book.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const books = [
  
  
  { title: "The Intelligent Investor", author: "Benjamin Graham", category: "Business", description: "A classic book on value investing, offering timeless advice on how to approach stock markets with intelligence and discipline.", copies: 5 },
  { title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", category: "History", description: "Explores the evolution of Homo sapiens from prehistoric times to the modern era, examining how biology and history define us.", copies: 5 },
  { title: "Atomic Habits", author: "James Clear", category: "Psychology", description: "A practical guide to breaking bad habits and building good ones through small, consistent changes that lead to remarkable results.", copies: 5 },
  { title: "Clean Code", author: "Robert C. Martin", category: "Computer", description: "A handbook of agile software craftsmanship, teaching principles of writing clean, efficient, and maintainable code.", copies: 5 },



  // Fiction
  { title: "Pride and Prejudice", author: "Jane Austen", category: "Fiction", description: "A timeless romantic novel of manners.", copies: 3 },
  { title: "1984", author: "George Orwell", category: "Fiction", description: "A dystopian social science fiction novel.", copies: 3 },
  { title: "To Kill a Mockingbird", author: "Harper Lee", category: "Fiction", description: "A novel of racial injustice and childhood innocence.", copies: 3 },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction", description: "The tragic story of Jay Gatsby and the American dream.", copies: 3 },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", category: "Fiction", description: "A story of teenage rebellion and loss of innocence.", copies: 3 },

  // Technology
  { title: "Clean Code", author: "Robert C. Martin", category: "Technology", description: "A guide to writing clean and maintainable software.", copies: 3 },
  { title: "JavaScript: The Good Parts", author: "Douglas Crockford", category: "Technology", description: "An exploration of JavaScript's elegant features.", copies: 3 },
  { title: "Design Patterns", author: "Erich Gamma", category: "Technology", description: "Reusable solutions to common software design problems.", copies: 3 },
  { title: "You Don't Know JS", author: "Kyle Simpson", category: "Technology", description: "Deep dive into the core mechanisms of JavaScript.", copies: 3 },
  { title: "The Pragmatic Programmer", author: "Andrew Hunt", category: "Technology", description: "Essential habits and practices of effective programmers.", copies: 3 },

  // Business
  { title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", category: "Business", description: "What the rich teach their kids about money.", copies: 3 },
  { title: "The Lean Startup", author: "Eric Ries", category: "Business", description: "How today's entrepreneurs use continuous innovation.", copies: 3 },
  { title: "Zero to One", author: "Peter Thiel", category: "Business", description: "Notes on startups and how to build the future.", copies: 3 },
  { title: "The Intelligent Investor", author: "Benjamin Graham", category: "Business", description: "A guide to value investing.", copies: 3 },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Business", description: "Exploration of human thinking and decision making.", copies: 3 },

  // Philosophy
  { title: "Meditations", author: "Marcus Aurelius", category: "Philosophy", description: "Reflections on life and virtue by a Roman Emperor.", copies: 3 },
  { title: "Beyond Good and Evil", author: "Friedrich Nietzsche", category: "Philosophy", description: "A challenge to traditional morality and religion.", copies: 3 },
  { title: "The Republic", author: "Plato", category: "Philosophy", description: "Plato’s ideal state and theory of justice.", copies: 3 },
  { title: "The Art of War", author: "Sun Tzu", category: "Philosophy", description: "Ancient Chinese strategy classic.", copies: 3 },
  { title: "Thus Spoke Zarathustra", author: "Friedrich Nietzsche", category: "Philosophy", description: "A philosophical novel exploring the Übermensch.", copies: 3 },

  // Psychology
  { title: "Man's Search for Meaning", author: "Viktor E. Frankl", category: "Psychology", description: "Finding meaning even in suffering.", copies: 3 },
  { title: "Emotional Intelligence", author: "Daniel Goleman", category: "Psychology", description: "Why EQ can matter more than IQ.", copies: 3 },
  { title: "Thinking in Systems", author: "Donella Meadows", category: "Psychology", description: "Understanding complex systems and feedback loops.", copies: 3 },
  { title: "The Power of Habit", author: "Charles Duhigg", category: "Psychology", description: "How habits are formed and changed.", copies: 3 },
  { title: "Flow", author: "Mihaly Csikszentmihalyi", category: "Psychology", description: "The psychology of optimal experience.", copies: 3 },

  // Science
  { title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", description: "From the Big Bang to black holes.", copies: 3 },
  { title: "The Selfish Gene", author: "Richard Dawkins", category: "Science", description: "A gene-centered view of evolution.", copies: 3 },
  { title: "Cosmos", author: "Carl Sagan", category: "Science", description: "Exploring the universe and humanity’s place within it.", copies: 3 },
  { title: "The Gene", author: "Siddhartha Mukherjee", category: "Science", description: "An intimate history of the gene.", copies: 3 },
  { title: "The Origin of Species", author: "Charles Darwin", category: "Science", description: "Foundation of evolutionary biology.", copies: 3 },

  // History
  { title: "Sapiens", author: "Yuval Noah Harari", category: "History", description: "A brief history of humankind.", copies: 3 },
  { title: "Guns, Germs, and Steel", author: "Jared Diamond", category: "History", description: "The fates of human societies.", copies: 3 },
  { title: "The Silk Roads", author: "Peter Frankopan", category: "History", description: "A new history of the world through trade routes.", copies: 3 },
  { title: "A People's History of the United States", author: "Howard Zinn", category: "History", description: "History from the viewpoint of the common people.", copies: 3 },
  { title: "Team of Rivals", author: "Doris Kearns Goodwin", category: "History", description: "The political genius of Abraham Lincoln.", copies: 3 },

  // Education
  { title: "Pedagogy of the Oppressed", author: "Paulo Freire", category: "Education", description: "Foundations of critical pedagogy.", copies: 3 },
  { title: "Mindset", author: "Carol Dweck", category: "Education", description: "The new psychology of success.", copies: 3 },
  { title: "The Montessori Method", author: "Maria Montessori", category: "Education", description: "Innovative teaching approach for children.", copies: 3 },
  { title: "How Children Learn", author: "John Holt", category: "Education", description: "Insights into natural learning processes.", copies: 3 },
  { title: "Teaching to Transgress", author: "bell hooks", category: "Education", description: "Education as the practice of freedom.", copies: 3 },

  // Art
  { title: "The Story of Art", author: "E.H. Gombrich", category: "Art", description: "A classic introduction to art history.", copies: 3 },
  { title: "Ways of Seeing", author: "John Berger", category: "Art", description: "The role of visual culture in society.", copies: 3 },
  { title: "The Lives of the Artists", author: "Giorgio Vasari", category: "Art", description: "Biographies of Renaissance artists.", copies: 3 },
  { title: "Interaction of Color", author: "Josef Albers", category: "Art", description: "A treatise on color theory and perception.", copies: 3 },
  { title: "Art as Experience", author: "John Dewey", category: "Art", description: "The philosophy of aesthetics and art creation.", copies: 3 },

  // Travel
  { title: "Into the Wild", author: "Jon Krakauer", category: "Travel", description: "The journey of Chris McCandless into the Alaskan wilderness.", copies: 3 },
  { title: "On the Road", author: "Jack Kerouac", category: "Travel", description: "A defining novel of the Beat Generation.", copies: 3 },
  { title: "The Alchemist", author: "Paulo Coelho", category: "Travel", description: "A fable about following your dreams.", copies: 3 },
  { title: "Eat, Pray, Love", author: "Elizabeth Gilbert", category: "Travel", description: "A woman's journey across Italy, India, and Indonesia.", copies: 3 },
  { title: "Wild", author: "Cheryl Strayed", category: "Travel", description: "A solo hike that became a journey of self-discovery.", copies: 3 },

  // Health
  { title: "Why We Sleep", author: "Matthew Walker", category: "Health", description: "Unlocking the power of sleep and dreams.", copies: 3 },
  { title: "The Body Keeps the Score", author: "Bessel van der Kolk", category: "Health", description: "The mind-body connection in trauma healing.", copies: 3 },
  { title: "How Not to Die", author: "Michael Greger", category: "Health", description: "Science-backed ways to prevent disease.", copies: 3 },
  { title: "Atomic Habits", author: "James Clear", category: "Health", description: "Tiny changes that yield remarkable results.", copies: 3 },
  { title: "Spark", author: "John Ratey", category: "Health", description: "Exercise and the brain’s potential.", copies: 3 },

  // Cooking
  { title: "Salt, Fat, Acid, Heat", author: "Samin Nosrat", category: "Cooking", description: "The four elements of good cooking.", copies: 3 },
  { title: "The Joy of Cooking", author: "Irma S. Rombauer", category: "Cooking", description: "Classic all-purpose cookbook.", copies: 3 },
  { title: "Essentials of Classic Italian Cooking", author: "Marcella Hazan", category: "Cooking", description: "Authentic Italian recipes.", copies: 3 },
  { title: "Mastering the Art of French Cooking", author: "Julia Child", category: "Cooking", description: "French cuisine simplified for home cooks.", copies: 3 },
  { title: "The Food Lab", author: "J. Kenji López-Alt", category: "Cooking", description: "Science-based cooking techniques.", copies: 3 },
];

await Book.deleteMany({});
await Book.insertMany(books);

console.log("✅ Seed data inserted successfully!");
process.exit();
