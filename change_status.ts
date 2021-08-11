import * as core from '@actions/core'
import * as github from '@actions/github'

const run = async (): Promise<void> => {
    try {
        const token = core.getInput('clickup_token')
        const task_id = core.getInput('clickup_custom_task_id')
        const team_id = core.getInput('clickup_team_id')
        const target_status = core.getInput('clickup_status')
        const put_body:JSON = <JSON><unknown>{
            "status": target_status
        }


        core.info(`Changed the status of ${task_id} successfully.`)
    } catch (error) {
        core.setFailed(`Action failed: ${error}`)
    }
}

run()

export default run
