export class WebinarNoRemainingSeatsException extends Error {
  constructor() {
    super('Webinar has no remaining seats');
    this.name = 'WebinarNoRemainingSeatsException';
  }
}

