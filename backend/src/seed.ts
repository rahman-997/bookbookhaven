import bcrypt from 'bcryptjs';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/mongoose';
import { User } from './modules/auth/user.model';
import { Book } from './modules/books/book.model';

const books = [
  { title: 'The Pragmatic Programmer', slug: 'the-pragmatic-programmer', author: 'David Thomas & Andrew Hunt', isbn: '9780135957059', description: 'A field guide to the habits, decisions and techniques that help software developers build better systems and keep improving their craft.', price: 39.99, stock: 24, categories: ['software', 'technology'], featured: true },
  { title: 'Atomic Habits', slug: 'atomic-habits', author: 'James Clear', isbn: '9780735211292', description: 'A practical framework for making tiny behavioral changes compound into better routines, stronger systems and durable personal progress.', price: 21.5, stock: 42, categories: ['self-development'], featured: true },
  { title: 'Clean Architecture', slug: 'clean-architecture', author: 'Robert C. Martin', isbn: '9780134494166', description: 'Principles for designing software around stable boundaries, independent business rules and structures that remain maintainable as systems grow.', price: 34, stock: 18, categories: ['software', 'architecture'], featured: false },
  { title: 'Deep Work', slug: 'deep-work', author: 'Cal Newport', isbn: '9781455586691', description: 'A case for protecting focused, distraction-free work and a set of practices for producing higher-value results in a noisy world.', price: 18.9, stock: 31, categories: ['productivity', 'self-development'], featured: true },
  { title: 'Designing Data-Intensive Applications', slug: 'designing-data-intensive-applications', author: 'Martin Kleppmann', isbn: '9781449373320', description: 'A systems-oriented tour of reliable, scalable and maintainable data applications, from storage engines and replication to distributed-system tradeoffs.', price: 46, stock: 13, categories: ['software', 'data', 'architecture'], featured: true },
  { title: 'The Psychology of Money', slug: 'the-psychology-of-money', author: 'Morgan Housel', isbn: '9780857197689', description: 'Short stories about behavior, uncertainty, patience and the surprisingly human decisions that shape long-term financial outcomes.', price: 19.75, stock: 27, categories: ['finance', 'psychology'], featured: false },
  { title: 'Thinking, Fast and Slow', slug: 'thinking-fast-and-slow', author: 'Daniel Kahneman', isbn: '9780374533557', description: 'An exploration of intuition, deliberation and the cognitive shortcuts that influence judgment, choice and the way people understand risk.', price: 23.4, stock: 17, categories: ['psychology', 'science'], featured: false },
  { title: 'The Lean Startup', slug: 'the-lean-startup', author: 'Eric Ries', isbn: '9780307887894', description: 'A framework for testing assumptions, learning from real customers and building products through fast, evidence-driven iteration.', price: 22, stock: 22, categories: ['business', 'startups'], featured: false },
  { title: 'Refactoring', slug: 'refactoring', author: 'Martin Fowler', isbn: '9780134757599', description: 'A practical catalog of techniques for improving the design of existing code while preserving its observable behavior.', price: 44.5, stock: 9, categories: ['software', 'engineering'], featured: false },
  { title: 'Start With Why', slug: 'start-with-why', author: 'Simon Sinek', isbn: '9781591846444', description: 'A leadership-focused look at purpose, communication and the patterns behind organizations that build trust and inspire action.', price: 17.25, stock: 36, categories: ['business', 'leadership'], featured: false }
];

async function seed() {
  await connectDatabase();
  await Book.bulkWrite(books.map((book) => ({
    updateOne: {
      filter: { slug: book.slug },
      update: { $set: book, $unset: { coverUrl: '' } },
      upsert: true
    }
  })));

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    { $set: { name: 'BookHaven Admin', email: env.ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'admin' } },
    { upsert: true, returnDocument: 'after' }
  );

  console.log(`Seeded ${books.length} books and admin ${env.ADMIN_EMAIL}`);
  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
