package services.AdventureService

import cats.effect.IO
import cats.syntax.all.*
import munit.CatsEffectSuite
import java.sql.Connection
import java.util.UUID
import services.system.database.Database
import services.system.objects.ApiError
import services.system.routes.Endpoint
import io.circe.Json
import services.AdventureService.objects.apiTypes.SaveListResponse
import services.PlayerService.api.{CreateAnonymousPlayerMessage,ResolvePlayerMessage,RegisterAccountMessage,LoginMessage}
import services.PlayerService.objects.PlayerId
import services.PlayerService.tables.Player.PlayerTableInitializer
import services.PlayerService.tables.PlayerSession.PlayerSessionTableInitializer
import services.AdventureService.api.*
import services.AdventureService.objects.*
import services.AdventureService.tables.Adventure.AdventureTableInitializer
import services.AdventureService.tables.GameSave.GameSaveTableInitializer
import services.AdventureService.tables.ProgressOperation.ProgressOperationTableInitializer
import services.AdventureService.utils.Content

class PersistenceSuite extends CatsEffectSuite:
  private def tx[A](f: Connection => IO[A]): IO[A] =
    IO.raiseUnless(sys.env.getOrElse("DATABASE_URL", "").endsWith("/oath_test"))(new IllegalStateException("Tests require isolated oath_test database")) *>
      Database.connection.use(c => Database.transaction(c)(f(c)))
  private def op: IO[String] = IO.delay(UUID.randomUUID().toString)
  private def player: IO[PlayerId] = for
    _ <- tx(c => List(PlayerTableInitializer.initialize(c),PlayerSessionTableInitializer.initialize(c),services.PlayerService.tables.Account.AccountTableInitializer.initialize(c),AdventureTableInitializer.initialize(c),GameSaveTableInitializer.initialize(c),ProgressOperationTableInitializer.initialize(c)).sequence_)
    session <- tx(c => CreateAnonymousPlayerMessage().plan(c))
    id <- tx(c => ResolvePlayerMessage(session.token).plan(c))
  yield id
  private def start(p: PlayerId) = op.flatMap(id => tx(c => StartAdventureMessage(p,Difficulty.easy,id,0).plan(c)))

  test("duplicate registration preserves the original account, password and guest ownership") {
    for
      owner <- player
      other <- player
      suffix <- op
      name = "hero_" + suffix.take(8)
      _ <- tx(c => RegisterAccountMessage(owner, name, "first-test-password").plan(c))
      duplicate <- tx(c => RegisterAccountMessage(other, name.toUpperCase(java.util.Locale.ROOT),
        "other-test-password").plan(c)).attempt
      wrong <- tx(c => LoginMessage(name, "other-test-password").plan(c)).attempt
      token <- tx(c => LoginMessage(name, "first-test-password").plan(c))
      resolved <- tx(c => ResolvePlayerMessage(token).plan(c))
      guest <- tx(c => ListSavesMessage(other).plan(c))
    yield
      assertEquals(duplicate.swap.toOption.collect { case e: ApiError => e.status }, Some(409))
      assertEquals(wrong.swap.toOption.collect { case e: ApiError => e.status }, Some(401))
      assertEquals(resolved, owner)
      assertEquals(guest.username, None)
  }

  test("new adventure survives independent connections and preserves fixed resources") {
    for
      p <- player
      result <- start(p)
      records <- tx(c => ListSavesMessage(p).plan(c))
    yield
      assertEquals(records.saves.map(_.id),List(result.save.id))
      assertEquals(records.continueSave,Some(result.save.id.value))
      assertEquals(result.save.snapshot.hp,100d)
      assertEquals(result.save.snapshot.mp,100d)
      assertEquals(result.revision,1L)
  }

  test("foreign player cannot load or overwrite another adventure") {
    for
      p <- player
      other <- player
      result <- start(p)
      id <- op
      denied <- tx(c => LoadAdventureMessage(other,result.save.id,id,0).plan(c)).attempt
      overwriteId <- op
      overwrite <- tx(c => SaveProgressMessage(other,result.save.adventureId,SaveKind.manual,1,result.save.snapshot,overwriteId,0).plan(c)).attempt
      listed <- tx(c => ListSavesMessage(other).plan(c))
    yield
      assertEquals(denied.swap.toOption.collect { case e: ApiError => e.code },Some("save_not_found"))
      assertEquals(overwrite.swap.toOption.collect { case e: ApiError => e.code },Some("adventure_not_found"))
      assertEquals(listed.saves,Nil)
  }

  test("automatic history keeps three records and manual slots remain independent") {
    for
      p <- player
      first <- start(p)
      saved <- (1 to 7).toList.foldM(first) { (last,n) =>
        op.flatMap(id => tx(c => SaveProgressMessage(p,last.save.adventureId,SaveKind.auto,0,last.save.snapshot.copy(mp=80),id,last.revision).plan(c)))
      }
      manual <- (1 to 5).toList.foldM(saved) { (last,n) =>
        op.flatMap(id => tx(c => SaveProgressMessage(p,last.save.adventureId,SaveKind.manual,n,last.save.snapshot,id,last.revision).plan(c)))
      }
      records <- tx(c => ListSavesMessage(p).plan(c))
    yield
      assertEquals(records.saves.count(_.kind == SaveKind.auto),3)
      assertEquals(records.saves.filter(_.kind == SaveKind.manual).map(_.slot).sorted,List(1,2,3,4,5))
      assertEquals(records.saves.size,8)
      assertEquals(manual.revision,13L)
  }

  test("same operation retries return original response without another revision") {
    for
      p <- player
      id <- op
      a <- tx(c => StartAdventureMessage(p,Difficulty.hard,id,0).plan(c))
      b <- tx(c => StartAdventureMessage(p,Difficulty.hard,id,0).plan(c))
      mismatch <- tx(c => StartAdventureMessage(p,Difficulty.easy,id,0).plan(c)).attempt
      list <- tx(c => ListSavesMessage(p).plan(c))
    yield
      assertEquals(a,b)
      assertEquals(list.adventures.size,1)
      assertEquals(list.revision,1L)
      assertEquals(mismatch.swap.toOption.collect { case e: ApiError => e.code },Some("operation_reused"))
  }

  test("load fences stale saves and faithfully restores resource values") {
    for
      p <- player
      first <- start(p)
      saveOp <- op
      manual <- tx(c => SaveProgressMessage(p,first.save.adventureId,SaveKind.manual,1,first.save.snapshot.copy(hp=72,mp=63,cooldowns=Cooldowns(2,0,0,0)),saveOp,1).plan(c))
      loadOp <- op
      loaded <- tx(c => LoadAdventureMessage(p,manual.save.id,loadOp,2).plan(c))
      staleOp <- op
      stale <- tx(c => SaveProgressMessage(p,first.save.adventureId,SaveKind.manual,1,first.save.snapshot,staleOp,2).plan(c)).attempt
      records <- tx(c => ListSavesMessage(p).plan(c))
    yield
      assertEquals(loaded.save.snapshot.hp,72d)
      assertEquals(loaded.save.snapshot.cooldowns.water,2d)
      assertEquals(records.continueSave,Some(manual.save.id.value))
      assertEquals(stale.swap.toOption.collect { case e: ApiError => e.code },Some("revision_conflict"))
      assert(records.saves.exists(_.id == manual.save.id))
  }

  test("invalid replacement rolls back and preserves slot and revision") {
    for
      p <- player
      first <- start(p)
      id <- op
      manual <- tx(c => SaveProgressMessage(p,first.save.adventureId,SaveKind.manual,1,first.save.snapshot,id,1).plan(c))
      invalidId <- op
      result <- tx(c => SaveProgressMessage(p,first.save.adventureId,SaveKind.manual,1,first.save.snapshot.copy(hp=101),invalidId,2).plan(c)).attempt
      list <- tx(c => ListSavesMessage(p).plan(c))
    yield
      assert(result.isLeft)
      assertEquals(list.revision,2L)
      assert(list.saves.exists(_.id == manual.save.id))
  }

  test("two concurrent writes at one revision commit only once") {
    for
      p <- player
      first <- start(p)
      a <- op
      b <- op
      outcomes <- List(a,b).parTraverse(id => tx(c => SaveProgressMessage(p,first.save.adventureId,SaveKind.manual,1,first.save.snapshot,id,1).plan(c)).attempt)
      list <- tx(c => ListSavesMessage(p).plan(c))
    yield
      assertEquals(outcomes.count(_.isRight),1)
      assertEquals(outcomes.count(_.isLeft),1)
      assertEquals(list.revision,2L)
      assertEquals(list.saves.count(_.kind == SaveKind.manual),1)
  }

  test("content validation rejects premature companions and solid geometry") {
    for
      initial <- Content.initial(Difficulty.easy)
      companion <- Content.validate(initial.copy(unlocked=List(Partner.gpt))).attempt
      outside <- Content.validate(initial.copy(position=Position(-1,200))).attempt
      incompatible <- Content.validate(initial.copy(contentVersion="future")).attempt
    yield
      assert(companion.isLeft)
      assert(outside.isLeft)
      assert(incompatible.isLeft)
  }

  test("every authored map accepts its safe arrival and cleared checkpoints in both difficulties") {
    for
      catalog <- Content.maps
      initial <- Content.initial(Difficulty.easy)
      _ <- List(Difficulty.easy,Difficulty.hard).traverse_ { difficulty =>
        catalog.zipWithIndex.traverse_ { (map,index) =>
          val stages = if map.next.isEmpty then List(ProgressStage.ending,ProgressStage.finished)
            else List(ProgressStage.arrival,ProgressStage.ready,ProgressStage.cleared)
          stages.traverse_ { stage =>
            val finished = catalog.take(index + (if stage == ProgressStage.cleared then 1 else 0))
            val unlocked = finished.flatMap(_.unlock)
            val supports = if map.finalPreparation then List(Partner.claude,Partner.gpt) else unlocked.take(2)
            val point = Position(map.spawn.head,map.spawn(1))
            Content.validate(initial.copy(difficulty=difficulty,mapId=map.id,checkpoint=map.checkpoint,
              stage=stage,position=point,completed=finished.flatMap(_.encounter),unlocked=unlocked,supports=supports))
          }
        }
      }
    yield ()
  }

  test("the epilogue rejects an exploration checkpoint that has no onward exit") {
    for
      catalog <- Content.maps
      initial <- Content.initial(Difficulty.easy)
      ending <- IO.fromOption(catalog.lastOption)(new IllegalStateException("Missing epilogue"))
      snapshot = initial.copy(mapId=ending.id,checkpoint=ending.checkpoint,
        completed=catalog.flatMap(_.encounter),unlocked=catalog.flatMap(_.unlock),
        supports=List(Partner.claude,Partner.gpt),stage=ProgressStage.ready)
      result <- Content.validate(snapshot).attempt
    yield assertEquals(result.swap.toOption.collect { case e: ApiError => e.code },Some("invalid_snapshot"))
  }

  test("final preparation requires Claude in the first slot and future content returns an explicit compatibility error") {
    for
      catalog <- Content.maps
      initial <- Content.initial(Difficulty.easy)
      throne = catalog.find(_.finalPreparation).get
      prior = catalog.takeWhile(_.id != throne.id)
      snapshot = initial.copy(mapId=throne.id,checkpoint=throne.checkpoint,
        position=Position(throne.spawn.head,throne.spawn(1)),completed=prior.flatMap(_.encounter),
        unlocked=prior.flatMap(_.unlock),supports=List(Partner.gpt,Partner.claude))
      invalid <- Content.validate(snapshot).attempt
      future <- Content.validate(initial.copy(contentVersion="future")).attempt
    yield
      assert(invalid.isLeft)
      assertEquals(future.swap.toOption.collect { case e: ApiError => e.code },Some("incompatible_save"))
  }

  test("listing holds one consistent player branch until its transaction finishes") {
    for
      p <- player
      first <- start(p)
      id <- op
      blocked <- tx { reader =>
        for
          listed <- ListSavesMessage(p).plan(reader)
          concurrent <- tx { writer =>
            Database.execute(writer, "SET LOCAL lock_timeout = '100ms'") *>
              SaveProgressMessage(p, first.save.adventureId, SaveKind.manual, 1,
                first.save.snapshot, id, first.revision).plan(writer)
          }.attempt
        yield (listed, concurrent)
      }
      saved <- tx(c => SaveProgressMessage(p, first.save.adventureId, SaveKind.manual, 1,
        first.save.snapshot, id, first.revision).plan(c))
      latest <- tx(c => ListSavesMessage(p).plan(c))
    yield
      assertEquals(blocked._1.revision, first.revision)
      assertEquals(blocked._1.continueSave, Some(first.save.id.value))
      assertEquals(blocked._2.swap.toOption.collect {
        case error: java.sql.SQLException => error.getSQLState
      }, Some("55P03"))
      assertEquals(latest.revision, saved.revision)
      assertEquals(latest.continueSave, Some(saved.save.id.value))
      assert(latest.saves.exists(_.id == saved.save.id))
  }

  test("route identity overrides client playerId and invalid tokens remain unauthorized") {
    for
      p <- player
      other <- player
      first <- start(p)
      endpoint = Endpoint.register[ListSavesMessage, SaveListResponse]("AdventureService")
      response <- tx(c => endpoint.run(Json.obj("playerId" -> Json.obj("value" -> Json.fromString(other.value))), c, Some(p)))
      list <- IO.fromEither(response.as[SaveListResponse])
      denied <- tx(c => ResolvePlayerMessage("invalid-test-token").plan(c)).attempt
    yield
      assertEquals(list.saves.map(_.id), List(first.save.id))
      assertEquals(denied.swap.toOption.collect { case error: ApiError => error.status }, Some(401))
  }
