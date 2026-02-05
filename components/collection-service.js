// Collection Service - Shared functionality for collection management
class CollectionService {
  constructor() {
    this.storageKey = 'vinyl_collection';
  }

  // Get all records from collection
  getCollection() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : [];
  }

  // Save entire collection
  saveCollection(collection) {
    localStorage.setItem(this.storageKey, JSON.stringify(collection));
  }

  // Add or update a record
  saveRecord(record) {
    const collection = this.getCollection();
    
    // Check if record exists
    const existingIndex = collection.findIndex(r => 
      r.artist === record.artist && 
      r.title === record.title &&
      r.catalogueNumber === record.catalogueNumber
    );

    if (existingIndex >= 0) {
      // Update existing
      collection[existingIndex] = {
        ...collection[existingIndex],
        ...record,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Add new
      record.dateAdded = record.dateAdded || new Date().toISOString();
      collection.push(record);
    }

    this.saveCollection(collection);
    return existingIndex >= 0 ? 'updated' : 'added';
  }

  // Delete a record
  deleteRecord(index) {
    const collection = this.getCollection();
    collection.splice(index, 1);
    this.saveCollection(collection);
  }

  // Get portfolio stats
  getStats() {
    const collection = this.getCollection();
    const totalRecords = collection.length;
    const totalInvested = collection.reduce((sum, r) => sum + (parseFloat(r.purchasePrice) || 0), 0);
    const totalValue = collection.reduce((sum, r) => sum + (parseFloat(r.estimatedValue) || 0), 0);
    const totalProfit = totalValue - totalInvested;
    const roi = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : 0;

    return {
      totalRecords,
      totalInvested,
      totalValue,
      totalProfit,
      roi
    };
  }

  // Find record by artist/title/cat#
  findRecord(artist, title, catalogueNumber) {
    const collection = this.getCollection();
    return collection.find(r => 
      r.artist === artist && 
      r.title === title &&
      r.catalogueNumber === catalogueNumber
    );
  }

  // Check if record exists
  recordExists(artist, title, catalogueNumber) {
    return !!this.findRecord(artist, title, catalogueNumber);
  }
}

window.collectionService = new CollectionService();