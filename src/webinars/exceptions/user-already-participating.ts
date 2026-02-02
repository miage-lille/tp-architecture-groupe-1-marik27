export class UserAlreadyParticipatingException extends Error {
  constructor() {
    super('User is already participating to this webinar');
    this.name = 'UserAlreadyParticipatingException';
  }
}

