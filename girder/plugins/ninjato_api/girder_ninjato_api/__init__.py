from girder.plugin import getPlugin, GirderPlugin
from girder.api import access
from girder.models.user import User
from girder.api.describe import Description, autoDescribeRoute
from girder.constants import AccessType
from girder.api.v1.collection import Collection
from .utils import get_item_assignment, save_user_annotation


@access.public
@autoDescribeRoute(
    Description('Get region assignment info for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .errorResponse()
    .errorResponse('Read access was denied on the user.', 403)
)
def getUserAssignInfo(user):
    return get_item_assignment(user)


@access.public
@autoDescribeRoute(
    Description('Save annotation for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('item_id', 'The item ID to save user annotation for', required=True)
    .param('done', 'A boolean True or False to indicate whether the annotation is done',
           dataType='boolean', default=False, required=False)
    .param('content_data', 'annotation content blob data in FormData format with data and size '
                           'keys to be saved on server ',
           required=True, paramType='formData')
    .errorResponse()
    .errorResponse('Save action was denied on the user.', 403)
    .errorResponse('Failed to save user annotations', 500)
)
def saveUserAnnotation(user, item_id, done, content_data):
    return save_user_annotation(user, item_id, done, content_data)


class NinjatoPlugin(GirderPlugin):
    DISPLAY_NAME = 'Girder Ninjato API'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        # add plugin loading logic here
        getPlugin('jobs').load(info)
        # attach API route to Girder
        info['apiRoot'].user.route('GET', (':id', 'assignment'), getUserAssignInfo)
        info['apiRoot'].user.route('POST', (':id', 'annotation'), saveUserAnnotation)
