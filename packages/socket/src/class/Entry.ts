export class Entry {
  private static entries: Record<string, string>
  
  static setEntries(data: Record<string, string>) {
    this.entries = data
  }

  static getEntries() {
    return Entry.entries.default
  }
}