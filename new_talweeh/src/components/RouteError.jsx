/* eslint-disable react/prop-types */
// Catches a page that fails to load or draw, so the visitor sees what happened and a way on, never an empty screen.
// A page file missing after a new version is reloaded by lib/newVersion.js first; this is what is left after that.
import { Component } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from './WahaShell'

export class RouteError extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidUpdate(prev) { if (prev.path !== this.props.path && this.state.error) this.setState({ error: null }) } // a new page tries again
  render() {
    if (!this.state.error) return this.props.children
    return (
      <WahaPage className="wh-route-error">
        <div className="wh-wrap wh-route-error-body" role="alert">
          <h1>This page didn’t load</h1>
          <p>The site may have just been updated, or the connection dropped. Reloading usually fixes it.</p>
          <div className="row">
            <button type="button" className="wh-btn wh-btn-g" onClick={() => window.location.reload()}>Reload the page</button>
            <Link className="wh-btn wh-btn-glass" to="/">Go to the home page</Link>
          </div>
        </div>
      </WahaPage>
    )
  }
}
