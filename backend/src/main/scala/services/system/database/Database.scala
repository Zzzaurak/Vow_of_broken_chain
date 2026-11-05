package services.system.database
import cats.effect.{IO, Resource, Outcome}
import cats.syntax.all.*
import java.sql.{Connection, DriverManager, PreparedStatement, ResultSet}
object Database:
  def connection: Resource[IO, Connection] = Resource.fromAutoCloseable(IO.blocking {
    DriverManager.getConnection(sys.env.getOrElse("DATABASE_URL", "jdbc:postgresql://127.0.0.1:55439/oath"), sys.env.getOrElse("PGUSER", "oath"), sys.env.getOrElse("PGPASSWORD", ""))
  })
  def transaction[A](c: Connection)(action: IO[A]): IO[A] =
    Resource.make(IO.blocking(c.setAutoCommit(false)))(_ => IO.blocking(c.setAutoCommit(true))).use { _ =>
      action.guaranteeCase {
        case Outcome.Succeeded(_) => IO.blocking(c.commit()).handleErrorWith(e => IO.blocking(c.rollback()) *> IO.raiseError(e))
        case _ => IO.blocking(c.rollback())
      }
    }
  private def statement(c: Connection, sql: String, args: List[Any]): Resource[IO, PreparedStatement] =
    Resource.fromAutoCloseable(IO.blocking(c.prepareStatement(sql))).evalTap(s => args.zipWithIndex.traverse_((a,i) => IO.blocking(s.setObject(i+1,a))))
  def execute(c: Connection, sql: String, args: List[Any] = Nil): IO[Int] = statement(c,sql,args).use(s => IO.blocking(s.executeUpdate()))
  def query[A](c: Connection, sql: String, args: List[Any] = Nil)(read: ResultSet => A): IO[List[A]] =
    statement(c,sql,args).use(s => Resource.fromAutoCloseable(IO.blocking(s.executeQuery())).use { rs =>
      cats.Monad[IO].tailRecM(List.empty[A]) { acc => IO.blocking(if rs.next() then Left(read(rs)::acc) else Right(acc.reverse)) }
    })
