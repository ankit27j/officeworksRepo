// Import first in a suite that needs STORAGE=memory: config is read when AppModule is imported.
// No DATABASE_URL either, to prove the API needs no database in this mode.
process.env.STORAGE = 'memory';
delete process.env.DATABASE_URL;
