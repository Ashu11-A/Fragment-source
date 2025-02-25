type Entries = {
  typescript: Record<string, string>
  javascript: Record<string, string>
}

export class Entry {
  private static entries: Entries
  
  static setEntries(data: Entries) {
    this.entries = data
  }

  static getEntries() {
    return Entry.entries
  }
}