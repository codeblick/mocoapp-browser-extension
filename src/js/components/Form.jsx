import React, { Component } from "react"
import PropTypes from "prop-types"
import Select from "components/Select"
import { formatDate } from "utils"
import cn from "classnames"
import StopWatchIcon from "components/shared/StopWatchIcon"

class Form extends Component {
  static propTypes = {
    changeset: PropTypes.shape({
      assignment_id: PropTypes.number.isRequired,
      billable: PropTypes.bool.isRequired,
      date: PropTypes.string.isRequired,
      task_id: PropTypes.number.isRequired,
      description: PropTypes.string,
      remote_id: PropTypes.string,
      remote_service: PropTypes.string,
      remote_url: PropTypes.string,
      seconds: PropTypes.number,
      hours: PropTypes.string,
      type: PropTypes.string,
      custom_type: PropTypes.string,
    }).isRequired,
    errors: PropTypes.object,
    projects: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    type: PropTypes.string,
  }

  isValid() {
    const { changeset } = this.props
    return (
      ["assignment_id", "task_id"].map((prop) => changeset[prop]).every(Boolean) &&
      (changeset.date === formatDate(new Date()) || changeset.seconds > 0)
    )
  }

  get isTimerStartable() {
    const {
      changeset: { seconds, date },
    } = this.props

    return date === formatDate(new Date()) && seconds === 0
  }

  get types() {
    return [
      { value: "Erstanalyse & Anforderungsaufnahme", label: "Erstanalyse & Anforderungsaufnahme" },
      { value: "Entwicklung", label: "Entwicklung" },
      { value: "Bugfixing", label: "Bugfixing" },
      { value: "Testing", label: "Testing" },
      { value: "Meeting & Abstimmung", label: "Meeting & Abstimmung" },
      { value: "Deployment & Monitoring", label: "Deployment & Monitoring" },
      { value: "Sonstiges", label: "Sonstiges" },
    ]
  }

  buttonStyle() {
    const styleMap = {
      true: {
        border: "none",
        borderRadius: "50%",
        width: "60px",
        height: "60px",
        marginTop: "22px",
        transition: "all 0.2s ease-in-out",
      },
      false: {
        border: "none",
        width: "50px",
        height: "36px",
        marginTop: "35px",
        transition: "all 0.2s ease-in-out",
      },
    }

    return styleMap[this.isTimerStartable]
  }

  handleTextareaKeyDown = (event) => {
    const { onSubmit } = this.props

    if (event.key === "Enter") {
      event.preventDefault()
      this.isValid() && onSubmit(event)
    }
  }

  render() {
    const { projects, changeset, errors, onChange, onSubmit } = this.props
    const project = Select.findOptionByValue(projects, changeset.assignment_id)
    const { types } = this

    return (
      <form onSubmit={onSubmit}>
        <div
          className={cn("form-group", {
            "has-error": errors.assignment_id || errors.task_id,
          })}
        >
          <Select
            className="moco-bx-select"
            name="assignment_id"
            placeholder="Auswählen..."
            options={projects}
            value={changeset.assignment_id}
            hasError={!!errors.assignment_id}
            onChange={onChange}
            noOptionsMessage={() => "Zuerst Projekt wählen"}
            defaultMenuIsOpen={true}
            autoFocus
          />
          <Select
            className="moco-bx-select"
            name="task_id"
            placeholder="Auswählen..."
            options={project?.tasks || []}
            value={changeset.task_id}
            onChange={onChange}
            hasError={!!errors.task_id}
            noOptionsMessage={() => "Zuerst Task wählen"}
          />
          {errors.assignment_id ? (
            <div className="form-error">{errors.assignment_id.join("; ")}</div>
          ) : null}
          {errors.task_id ? <div className="form-error">{errors.task_id.join("; ")}</div> : null}

          <Select
            className="moco-bx-select"
            name="type"
            placeholder="Bitte auswählen oder -füllen..."
            options={types || []}
            value={changeset.type}
            onChange={onChange}
          />
          <textarea
            style={{ marginTop: "3px" }}
            name="custom_type"
            onChange={onChange}
            value={changeset.custom_type}
            placeholder={`Beschreibung der Tätigkeit${changeset.type == "Sonstiges" ? "" : " (optional)"}`}
            maxLength={500}
            rows={3}
            onKeyDown={this.handleTextareaKeyDown}
            required={changeset.type == "Sonstiges"}
          />
          {errors.description ? (
            <div className="form-error">{errors.description.join("; ")}</div>
          ) : null}
        </div>

        <div className={cn("form-group", { "has-error": errors.hours })}>
          <input
            name="hours"
            className="form-control"
            onChange={onChange}
            value={changeset.hours}
            placeholder="0:00"
            autoComplete="off"
            tabIndex={0}
            autoFocus
          />
          {errors.hours ? <div className="form-error">{errors.hours.join("; ")}</div> : null}
        </div>

        <button
          type="submit"
          className="moco-bx-btn"
          disabled={!this.isValid()}
          style={this.buttonStyle()}
        >
          {this.isTimerStartable ? <StopWatchIcon /> : "OK"}
        </button>
      </form>
    )
  }
}

export default Form
