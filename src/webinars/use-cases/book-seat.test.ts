import { InMemoryMailer } from 'src/core/adapters/in-memory-mailer';
import { User } from 'src/users/entities/user.entity';
import { InMemoryUserRepository } from 'src/users/adapters/user-repository.in-memory';
import { Participation } from 'src/webinars/entities/participation.entity';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { UserAlreadyParticipatingException } from 'src/webinars/exceptions/user-already-participating';
import { WebinarNoRemainingSeatsException } from 'src/webinars/exceptions/webinar-no-remaining-seats';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { InMemoryParticipationRepository } from 'src/webinars/adapters/participation-repository.in-memory';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { BookSeat } from 'src/webinars/use-cases/book-seat';

describe('Feature: Book seat', () => {
  let participationRepository: InMemoryParticipationRepository;
  let userRepository: InMemoryUserRepository;
  let webinarRepository: InMemoryWebinarRepository;
  let mailer: InMemoryMailer;
  let useCase: BookSeat;

  let organizer: User;
  let attendee: User;
  let webinar: Webinar;

  beforeEach(() => {
    participationRepository = new InMemoryParticipationRepository();
    userRepository = new InMemoryUserRepository();
    webinarRepository = new InMemoryWebinarRepository();
    mailer = new InMemoryMailer();
    useCase = new BookSeat(
      participationRepository,
      userRepository,
      webinarRepository,
      mailer,
    );

    organizer = new User({
      id: 'user-organizer-id',
      email: 'organizer@email.com',
      password: 'password',
    });
    attendee = new User({
      id: 'user-attendee-id',
      email: 'attendee@email.com',
      password: 'password',
    });
    webinar = new Webinar({
      id: 'webinar-1',
      organizerId: organizer.props.id,
      title: 'DDD 101',
      startDate: new Date('2024-02-01T10:00:00.000Z'),
      endDate: new Date('2024-02-01T11:00:00.000Z'),
      seats: 2,
    });

    userRepository.database.push(organizer, attendee);
    webinarRepository.database.push(webinar);
  });

  describe('Scenario: happy path', () => {
    it('should create a participation', async () => {
      await useCase.execute({ webinarId: webinar.props.id, user: attendee });

      expect(participationRepository.database).toHaveLength(1);
      expect(participationRepository.database[0].props).toEqual({
        webinarId: webinar.props.id,
        userId: attendee.props.id,
      });
    });

    it('should notify the organizer by email', async () => {
      await useCase.execute({ webinarId: webinar.props.id, user: attendee });

      expect(mailer.sentEmails).toEqual([
        {
          to: organizer.props.email,
          subject: 'New participant for "DDD 101"',
          body: 'attendee@email.com booked a seat for "DDD 101".',
        },
      ]);
    });
  });

  describe('Scenario: webinar is full', () => {
    beforeEach(() => {
      participationRepository.database.push(
        new Participation({
          userId: 'user-1',
          webinarId: webinar.props.id,
        }),
        new Participation({
          userId: 'user-2',
          webinarId: webinar.props.id,
        }),
      );
    });

    it('should throw an error', async () => {
      await expect(
        useCase.execute({ webinarId: webinar.props.id, user: attendee }),
      ).rejects.toThrow(WebinarNoRemainingSeatsException);
    });

    it('should not add a new participation', async () => {
      try {
        await useCase.execute({ webinarId: webinar.props.id, user: attendee });
      } catch (error) {}

      expect(participationRepository.database).toHaveLength(2);
    });

    it('should not send an email', async () => {
      try {
        await useCase.execute({ webinarId: webinar.props.id, user: attendee });
      } catch (error) {}

      expect(mailer.sentEmails).toEqual([]);
    });
  });

  describe('Scenario: user already registered', () => {
    beforeEach(() => {
      participationRepository.database.push(
        new Participation({
          userId: attendee.props.id,
          webinarId: webinar.props.id,
        }),
      );
    });

    it('should throw an error', async () => {
      await expect(
        useCase.execute({ webinarId: webinar.props.id, user: attendee }),
      ).rejects.toThrow(UserAlreadyParticipatingException);
    });

    it('should not send an email', async () => {
      try {
        await useCase.execute({ webinarId: webinar.props.id, user: attendee });
      } catch (error) {}

      expect(mailer.sentEmails).toEqual([]);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    it('should throw an error', async () => {
      await expect(
        useCase.execute({ webinarId: 'unknown', user: attendee }),
      ).rejects.toThrow(WebinarNotFoundException);
    });
  });
});

