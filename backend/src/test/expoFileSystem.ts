export class File {
  readonly exists = true;
  readonly name: string;
  readonly type: string;

  constructor(readonly uri: string) {
    this.name = uri.split('/').pop() || 'photo.jpg';
    const extension = this.name.split('.').pop()?.toLowerCase();
    this.type = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  }

  async bytes() {
    return new Uint8Array([1, 2, 3]);
  }
}
