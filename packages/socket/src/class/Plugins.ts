export class Plugins {
  private static plugins: Record<string, string>
  
  static setPlugins(data: Record<string, string>) {
    this.plugins = data
  }

  static getPlugins() {
    return Plugins.plugins.default
  }
}