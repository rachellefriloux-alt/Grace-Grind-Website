import { Route, Switch } from "wouter";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Book from "./pages/Book";
import Privacy from "./pages/Privacy";
import Portal from "./pages/Portal";
import Admin from "./pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/book"} component={Book} />
      <Route path={"/book.html"} component={Book} />
      <Route path={"/signup"} component={Portal} />
      <Route path={"/portal"} component={Portal} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return <Router />;
}

export default App;
