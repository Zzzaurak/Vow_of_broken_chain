package services.system.api
import cats.effect.IO
import java.sql.Connection
trait APIMessage[A]:
  def plan(connection: Connection): IO[A]
trait NoRequestMessage[A] extends APIMessage[A]
