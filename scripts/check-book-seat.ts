import { InMemoryMailer } from '../src/core/adapters/in-memory-mailer';
import { InMemoryUserRepository } from '../src/users/adapters/user-repository.in-memory';
import { User } from '../src/users/entities/user.entity';
import { InMemoryParticipationRepository } from '../src/webinars/adapters/participation-repository.in-memory';
import { InMemoryWebinarRepository } from '../src/webinars/adapters/webinar-repository.in-memory';
import { Webinar } from '../src/webinars/entities/webinar.entity';
import { BookSeat } from '../src/webinars/use-cases/book-seat';

async function main() {
  const participationRepo = new InMemoryParticipationRepository();
  const userRepo = new InMemoryUserRepository();
  const webinarRepo = new InMemoryWebinarRepository();
  const mailer = new InMemoryMailer();

  const organizer = new User({
    id: 'user-organizer-id',
    email: 'organizer@email.com',
    password: 'password',
  });
  const attendee = new User({
    id: 'user-attendee-id',
    email: 'attendee@email.com',
    password: 'password',
  });
  const webinar = new Webinar({
    id: 'webinar-1',
    organizerId: organizer.props.id,
    title: 'DDD 101',
    startDate: new Date('2024-02-01T10:00:00.000Z'),
    endDate: new Date('2024-02-01T11:00:00.000Z'),
    seats: 2,
  });

  userRepo.database.push(organizer, attendee);
  webinarRepo.database.push(webinar);

  const useCase = new BookSeat(participationRepo, userRepo, webinarRepo, mailer);

  await useCase.execute({ webinarId: webinar.props.id, user: attendee });

  console.log('Participations:', participationRepo.database.map((p) => p.props));
  console.log('Emails:', mailer.sentEmails);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

