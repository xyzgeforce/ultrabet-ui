import { getClient } from '@/lib/client'
import { EventFragment, ListEventsDocument } from '@/gql/documents.generated'
import { EventList } from '@/ui/event-list'
import styles from '../page.module.css'

export const revalidate = 60

export default async function Page() {
  const data = await getClient().query({
    query: ListEventsDocument,
  })
  if (!data.data.listEvents) return null
  return (
    <main>
      <h1 className={styles.header}>Upcoming Events</h1>
      <EventList events={data.data.listEvents as EventFragment[]} />
    </main>
  )
}
