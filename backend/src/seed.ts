import bcrypt from 'bcryptjs';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/mongoose';
import { User } from './modules/auth/user.model';
import { Book } from './modules/books/book.model';

const books = [
  { title: 'The Pragmatic Programmer', slug: 'the-pragmatic-programmer', author: 'David Thomas & Andrew Hunt', description: 'A practical guide to becoming a more effective software developer.', price: 39.99, stock: 24, categories: ['software', 'technology'], featured: true, coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80' },
  { title: 'Atomic Habits', slug: 'atomic-habits', author: 'James Clear', description: 'A practical framework for building good habits and breaking bad ones.', price: 21.5, stock: 42, categories: ['self-development'], featured: true, coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80' },
  { title: 'Clean Architecture', slug: 'clean-architecture', author: 'Robert C. Martin', description: 'Principles for building maintainable software systems and strong boundaries.', price: 34, stock: 18, categories: ['software', 'architecture'], featured: false, coverUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80' },
  { title: 'Deep Work', slug: 'deep-work', author: 'Cal Newport', description: 'Ideas and practices for focused work in a distracted world.', price: 18.9, stock: 31, categories: ['productivity', 'self-development'], featured: true, coverUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80' },
  { title: 'Designing Data-Intensive Applications', slug: 'designing-data-intensive-applications', author: 'Martin Kleppmann', description: 'A systems-oriented exploration of reliable, scalable and maintainable data applications.', price: 46, stock: 13, categories: ['software', 'data', 'architecture'], featured: true, coverUrl: 'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=900&q=80' },
  { title: 'The Psychology of Money', slug: 'the-psychology-of-money', author: 'Morgan Housel', description: 'Stories and lessons about behavior, wealth and long-term financial decisions.', price: 19.75, stock: 27, categories: ['finance', 'psychology'], featured: false, coverUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80' },
  { title: 'Thinking, Fast and Slow', slug: 'thinking-fast-and-slow', author: 'Daniel Kahneman', description: 'An exploration of judgment, intuition and the two modes that shape human thinking.', price: 23.4, stock: 17, categories: ['psychology', 'science'], featured: false, coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=900&q=80' },
  { title: 'The Lean Startup', slug: 'the-lean-startup', author: 'Eric Ries', description: 'A framework for testing product assumptions, learning quickly and building sustainable companies.', price: 22, stock: 22, categories: ['business', 'startups'], featured: false, coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80' },
  { title: 'Refactoring', slug: 'refactoring', author: 'Martin Fowler', description: 'Techniques for improving existing code while preserving its observable behavior.', price: 44.5, stock: 9, categories: ['software', 'engineering'], featured: false, coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80' },
  { title: 'Start With Why', slug: 'start-with-why', author: 'Simon Sinek', description: 'A leadership-oriented look at purpose, communication and organizations that inspire.', price: 17.25, stock: 36, categories: ['business', 'leadership'], featured: false, coverUrl: 'https://images.unsplash.com/photo-1511108690759-009324a90311?auto=format&fit=crop&w=900&q=80' }
];

async function seed() {
  await connectDatabase();
  await Book.bulkWrite(books.map((book) => ({ updateOne: { filter: { slug: book.slug }, update: { $set: book }, upsert: true } })));

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    { $set: { name: 'BookHaven Admin', email: env.ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'admin' } },
    { upsert: true, new: true }
  );

  console.log(`Seeded ${books.length} books and admin ${env.ADMIN_EMAIL}`);
  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
